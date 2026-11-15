"""
AstroHealth API: a ponte entre o front (app/) e o banco no Supabase.

Rodar:  cd api && uvicorn main:app --reload --port 8000
Docs:   http://localhost:8000/docs  (dá para testar todas as rotas por lá)

Toda rota (menos cadastro, login e /saude) exige o header
    Authorization: Bearer <access_token que o /auth/login devolveu>
e fala com o Supabase usando esse token, então o RLS decide o que cada pessoa vê.
"""
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import date, timedelta
from enum import Enum
from pathlib import Path
from typing import Optional
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator

import regras
from supabase_rest import Supabase, SupabaseErro

# .env em api/, na raiz do projeto ou em SGBD/ (o mesmo dos scripts da Elisa)
_aqui = Path(__file__).resolve().parent
for _env in (_aqui / ".env", _aqui.parent / ".env", _aqui.parent / "SGBD" / ".env"):
    if _env.exists():
        load_dotenv(_env)
        break

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")
SUPABASE_KEY = (os.getenv("SUPABASE_KEY") or "").strip()
ORIGENS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:8080,http://127.0.0.1:8080,https://spaceapps-infinitygirls.web.app,https://spaceapps-infinitygirls.firebaseapp.com",
).split(",") if o.strip()]

BUCKET_IMAGENS = "exames-imagem"
TIPOS_IMAGEM = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
TAMANHO_MAX_IMAGEM = 10 * 1024 * 1024  # 10 MB

log = logging.getLogger("astrohealth")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def ciclo(app):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Faltam SUPABASE_URL e SUPABASE_KEY no .env (veja api/.env.example).")
    app.state.sb = Supabase(SUPABASE_URL, SUPABASE_KEY)
    yield
    await app.state.sb.fechar()


app = FastAPI(title="AstroHealth API", version="1.0.0", lifespan=ciclo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def sb(request: Request) -> Supabase:
    return request.app.state.sb


# ---------------------------------------------------------------------------
# Erros: sempre {"detail": {"message": "...", "fields": {...}}}, em texto claro
# (o front mostra a mensagem e o leitor de tela anuncia; nada de "Erro 401" solto)
# ---------------------------------------------------------------------------

def falha(status, mensagem, campos=None):
    detalhe = {"message": mensagem}
    if campos:
        detalhe["fields"] = campos
    return HTTPException(status_code=status, detail=detalhe)


def traduzir(erro: SupabaseErro, contexto=""):
    log.warning("Supabase %s %s %s: %s", contexto, erro.status, erro.codigo, erro.mensagem)
    texto = erro.mensagem.lower()
    if erro.codigo == "23505" or "duplicate" in texto or "already registered" in texto or "already exists" in texto:
        return falha(409, "This ID is already registered.")
    if erro.codigo == "23514" or "check constraint" in texto:
        return falha(422, "Some values are outside the accepted range. Check the numbers and try again.")
    if erro.codigo == "42501" or "row-level security" in texto or erro.status == 403:
        return falha(403, "You don't have permission to do this.")
    if erro.status == 401 or "jwt" in texto:
        return falha(401, "Your session has expired. Sign in again.")
    if erro.status == 404:
        return falha(404, "Not found.")
    return falha(502, "The health database did not answer as expected. Try again in a moment.")


@app.exception_handler(RequestValidationError)
async def validacao(request: Request, exc: RequestValidationError):
    campos = {}
    for item in exc.errors():
        local = [str(p) for p in item.get("loc", []) if p not in ("body", "query", "path", "header")]
        campos[".".join(local) or "request"] = item.get("msg", "Invalid value.")
    return JSONResponse(
        status_code=422,
        content={"detail": {"message": "Some fields are missing or invalid.", "fields": campos}},
    )


# ---------------------------------------------------------------------------
# Quem está logado
# ---------------------------------------------------------------------------

class Sessao(BaseModel):
    token: str
    id: str
    perfil: Optional[str] = None
    nome: Optional[str] = None
    id_number: Optional[str] = None


# HTTPBearer faz aparecer o botão "Authorize" no /docs: cola o token uma vez e vale para todas as rotas
_bearer = HTTPBearer(auto_error=False, description="Cole só o access_token (sem a palavra Bearer)")


async def sessao(
    request: Request, credenciais: Optional[HTTPAuthorizationCredentials] = Depends(_bearer)
) -> Sessao:
    if not credenciais or not credenciais.credentials:
        raise falha(401, "Sign in to continue.")
    token = credenciais.credentials.strip()
    cliente = sb(request)
    try:
        usuario = await cliente.usuario(token)
    except SupabaseErro as e:
        # token quebrado, expirado ou de outro projeto: o Supabase pode responder 401 ou 403
        log.info("token recusado: %s %s", e.status, e.mensagem)
        raise falha(401, "Your session has expired. Sign in again.")
    try:
        linhas = await cliente.selecionar(
            "usuarios", token, {"id": f"eq.{usuario['id']}", "select": "id,nome,perfil,nasa_id"}
        )
    except SupabaseErro as e:
        raise traduzir(e, "sessao")
    perfil = linhas[0] if linhas else {}
    return Sessao(token=token, id=usuario["id"], perfil=perfil.get("perfil"),
                  nome=perfil.get("nome"), id_number=perfil.get("nasa_id"))


async def medico(s: Sessao = Depends(sessao)) -> Sessao:
    if s.perfil != "medico":
        raise falha(403, "Only the medical officer can do this.")
    return s


def perfil_publico(linha):
    """Formato do perfil que volta para o front (com os nomes de campo do front)."""
    if not linha:
        return None
    return {
        "id": linha.get("id"),
        "idNumber": linha.get("nasa_id"),  # no schema.sql a coluna nasa_id guarda o AST-/CRM
        "name": linha.get("nome"),
        "role": regras.PAPEL_POR_PERFIL.get(linha.get("perfil")),
        "sex": linha.get("sexo"),
        "birthDate": linha.get("data_nascimento"),
        "mission": linha.get("missao"),
        "bloodType": linha.get("tipo_sanguineo"),
    }


# ---------------------------------------------------------------------------
# Saúde da API
# ---------------------------------------------------------------------------

@app.get("/saude", tags=["sistema"])
async def saude():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Autenticação: login pelo ID AST-/CRM + senha (modelo do SGBD/schema.sql)
# ---------------------------------------------------------------------------

class Cadastro(BaseModel):
    name: str
    password: str
    idNumber: str
    birthDate: date
    sex: Optional[str] = None
    mission: Optional[str] = "Artemis IV"
    bloodType: Optional[str] = None


class Login(BaseModel):
    idNumber: str = Field(description="AST-1234 ou CRM-SP 123456 (aceita as mesmas formas que o front)")
    password: str


class Renovar(BaseModel):
    refresh_token: str


def resposta_sessao(dados, perfil):
    return {
        "access_token": dados.get("access_token"),
        "refresh_token": dados.get("refresh_token"),
        "expires_in": dados.get("expires_in"),
        "user": perfil_publico(perfil),
    }


async def buscar_perfil(cliente, token, usuario_id):
    linhas = await cliente.selecionar("usuarios", token, {"id": f"eq.{usuario_id}", "select": "*"})
    return linhas[0] if linhas else None


@app.post("/auth/cadastro", status_code=201, tags=["auth"])
async def cadastrar(corpo: Cadastro, request: Request):
    erros = regras.validar_cadastro(corpo.model_dump())
    if erros:
        raise falha(422, "Some fields are missing or invalid.", erros)
    papel, id_number = regras.identificar(corpo.idNumber)
    cliente = sb(request)
    try:
        if await cliente.rpc("obter_email_por_nasa_id", args={"p_nasa_id": id_number}):
            raise falha(409, "This ID is already registered. Sign in instead.", {"idNumber": "Already registered."})
        # As chaves batem com o trigger handle_new_user do schema.sql
        dados = await cliente.cadastrar(regras.email_interno(id_number), corpo.password, {
            "nome": corpo.name.strip(),
            "nasa_id": id_number,
            "sexo": corpo.sex if papel == "astronaut" else None,
            "data_nascimento": corpo.birthDate.isoformat(),
            "missao": corpo.mission,
            "tipo_sanguineo": (corpo.bloodType or "N/I").upper(),
        })
    except SupabaseErro as e:
        raise traduzir(e, "cadastro")

    # Com confirmação de e-mail desligada no Supabase, o cadastro já devolve a sessão
    if dados and dados.get("access_token"):
        usuario_id = dados["user"]["id"]
        try:
            perfil = await buscar_perfil(cliente, dados["access_token"], usuario_id)
        except SupabaseErro as e:
            raise traduzir(e, "cadastro-perfil")
        return resposta_sessao(dados, perfil)
    return {"message": "Account created. Sign in with your ID.", "user": None}


@app.post("/auth/login", tags=["auth"])
async def entrar(corpo: Login, request: Request):
    cliente = sb(request)
    errado = falha(401, "ID or password is incorrect.")
    quem = regras.identificar(corpo.idNumber)
    if not quem or not corpo.password:
        raise errado
    try:
        email = await cliente.rpc("obter_email_por_nasa_id", args={"p_nasa_id": quem[1]})
        if not email:
            raise errado
        dados = await cliente.entrar(email, corpo.password)
        perfil = await buscar_perfil(cliente, dados["access_token"], dados["user"]["id"])
    except SupabaseErro as e:
        if e.status in (400, 401):
            raise errado
        raise traduzir(e, "login")
    return resposta_sessao(dados, perfil)


@app.post("/auth/renovar", tags=["auth"])
async def renovar(corpo: Renovar, request: Request):
    cliente = sb(request)
    try:
        dados = await cliente.renovar(corpo.refresh_token)
        perfil = await buscar_perfil(cliente, dados["access_token"], dados["user"]["id"])
    except SupabaseErro as e:
        if e.status in (400, 401):
            raise falha(401, "Your session has expired. Sign in again.")
        raise traduzir(e, "renovar")
    return resposta_sessao(dados, perfil)


@app.post("/auth/sair", status_code=204, tags=["auth"])
async def sair(request: Request, s: Sessao = Depends(sessao)):
    try:
        await sb(request).sair(s.token)
    except SupabaseErro:
        pass  # sair nunca deve falhar para quem está saindo
    return None


@app.get("/eu", tags=["auth"])
async def eu(request: Request, s: Sessao = Depends(sessao)):
    try:
        return perfil_publico(await buscar_perfil(sb(request), s.token, s.id))
    except SupabaseErro as e:
        raise traduzir(e, "eu")


# ---------------------------------------------------------------------------
# Sinais vitais, glicose e exames de sangue (lacunas 2, 6 e 13)
# ---------------------------------------------------------------------------

class Ambiente(str, Enum):
    nave = "nave"
    estacao = "estacao"
    lua_base = "lua_base"
    lua_rover = "lua_rover"
    marte_base = "marte_base"
    marte_rover = "marte_rover"


class MarcadorImune(str, Enum):
    normal = "normal"
    elevado = "elevado"
    baixo = "baixo"


class SinaisVitais(BaseModel):
    ambiente_missao: Ambiente = Ambiente.estacao
    frequencia_cardiaca_bpm: int = Field(ge=20, le=250)
    pressao_sistolica_mmhg: float = Field(ge=50, le=260)
    pressao_diastolica_mmhg: float = Field(ge=30, le=160)
    oxigenacao_spo2: float = Field(ge=50, le=100)
    glicose_mg_dl: float = Field(ge=20, le=600)  # obrigatória no schema.sql
    cetonas_mmol: Optional[float] = Field(None, ge=0, le=10)
    cortisol_saliva_ng: Optional[float] = Field(None, ge=0, le=100)
    marcador_imune_status: MarcadorImune = MarcadorImune.normal
    temperatura_celsius: Optional[float] = Field(None, ge=30, le=45)
    horas_sono: Optional[float] = Field(None, ge=0, le=24)
    calorias_kcal: Optional[int] = Field(None, ge=0, le=10000)
    proteina_g: Optional[float] = Field(None, ge=0, le=1000)
    vitamina_d_ui: Optional[int] = Field(None, ge=0, le=100000)
    calcio_mg: Optional[int] = Field(None, ge=0, le=10000)

    @model_validator(mode="after")
    def pressao_coerente(self):
        if self.pressao_sistolica_mmhg <= self.pressao_diastolica_mmhg:
            raise ValueError("Systolic pressure must be higher than diastolic pressure.")
        return self


def enriquecer_vitais(linha):
    """Acrescenta status em texto e unidades (o front nunca precisa mostrar só cor ou só número)."""
    if not linha:
        return linha
    return {
        **linha,
        "status": regras.rotulo_status(regras.STATUS_ALERTA, linha.get("status_alerta")),
        "unidades": {k: v for k, v in regras.UNIDADES.items() if k in linha},
    }


@app.post("/sinais-vitais", status_code=201, tags=["astronauta"])
async def registrar_vitais(corpo: SinaisVitais, request: Request, s: Sessao = Depends(sessao)):
    linha = {k: v for k, v in corpo.model_dump(mode="json").items() if v is not None}
    linha["usuario_id"] = s.id
    # O trigger de alerta da Elisa lê pressao_arterial_mmhg: mantém a sistólica nela
    linha["pressao_arterial_mmhg"] = corpo.pressao_sistolica_mmhg
    try:
        return enriquecer_vitais(await sb(request).inserir("sinais_vitais", s.token, linha))
    except SupabaseErro as e:
        raise traduzir(e, "sinais-vitais")


@app.get("/sinais-vitais", tags=["astronauta", "medico"])
async def listar_vitais(
    request: Request,
    s: Sessao = Depends(sessao),
    usuario_id: Optional[UUID] = Query(None, description="Só para o médico: id (UUID) do astronauta"),
    limite: int = Query(50, ge=1, le=500),
):
    alvo = usuario_id if (usuario_id and s.perfil == "medico") else s.id
    try:
        linhas = await sb(request).selecionar("sinais_vitais", s.token, {
            "usuario_id": f"eq.{alvo}", "order": "registrado_em.desc", "limit": str(limite), "select": "*",
        })
    except SupabaseErro as e:
        raise traduzir(e, "sinais-vitais-lista")
    return [enriquecer_vitais(l) for l in linhas]


# ---------------------------------------------------------------------------
# Exames de imagem / ultrassom (lacuna 3)
# ---------------------------------------------------------------------------

class TipoExame(str, Enum):
    ultrassom_venoso = "ultrassom_venoso"
    oct_retina = "oct_retina"
    outro = "outro"


class StatusLeitura(str, Enum):
    normal = "normal"
    atencao = "atencao"
    critico = "critico"


class Parecer(BaseModel):
    status_leitura: StatusLeitura
    parecer_medico: str = Field(min_length=3, max_length=2000)


async def enriquecer_exame(cliente, token, linha):
    caminho = linha.get("imagem_url")
    link = None
    if caminho:
        try:
            link = await cliente.link_assinado(BUCKET_IMAGENS, caminho, token)
        except SupabaseErro as e:
            log.warning("link assinado falhou para %s: %s", caminho, e.mensagem)
    return {
        **linha,
        "imagem_link": link,  # válido por 10 minutos
        "imagem_alt": linha.get("descricao_imagem") or f"{linha.get('tipo_exame', 'Exam')} image, {linha.get('regiao_anatomica', '')}".strip(", "),
        "status": regras.rotulo_status(regras.STATUS_LEITURA, linha.get("status_leitura")),
    }


@app.post("/exames-imagem", status_code=201, tags=["astronauta"])
async def enviar_exame(
    request: Request,
    s: Sessao = Depends(sessao),
    arquivo: UploadFile = File(...),
    regiao_anatomica: str = Form(..., min_length=2, max_length=50),
    descricao_imagem: str = Form(..., min_length=5, max_length=500,
                                 description="Texto alternativo da imagem (leitor de tela)"),
    tipo_exame: TipoExame = Form(TipoExame.ultrassom_venoso),
    observacao_astronauta: Optional[str] = Form(None, max_length=1000),
):
    extensao = TIPOS_IMAGEM.get(arquivo.content_type or "")
    if not extensao:
        raise falha(415, "Send the image as JPEG, PNG or WebP.", {"arquivo": "Unsupported file type."})
    conteudo = await arquivo.read()
    if not conteudo:
        raise falha(422, "The image file is empty.", {"arquivo": "Empty file."})
    if len(conteudo) > TAMANHO_MAX_IMAGEM:
        raise falha(413, "The image is larger than 10 MB.", {"arquivo": "File too large."})

    caminho = f"{s.id}/{tipo_exame.value}_{int(time.time() * 1000)}.{extensao}"
    cliente = sb(request)
    try:
        await cliente.enviar_arquivo(BUCKET_IMAGENS, caminho, conteudo, arquivo.content_type, s.token)
        linha = await cliente.inserir("exames_imagem", s.token, {
            "usuario_id": s.id,
            "tipo_exame": tipo_exame.value,
            "regiao_anatomica": regiao_anatomica.strip(),
            "imagem_url": caminho,
            "descricao_imagem": descricao_imagem.strip(),
            "observacao_astronauta": (observacao_astronauta or "").strip() or None,
        })
    except SupabaseErro as e:
        raise traduzir(e, "exames-imagem")
    return await enriquecer_exame(cliente, s.token, linha)


@app.get("/exames-imagem", tags=["astronauta", "medico"])
async def listar_exames(
    request: Request,
    s: Sessao = Depends(sessao),
    status: Optional[str] = Query(None, description="Ex.: pendente"),
    usuario_id: Optional[UUID] = Query(None, description="Só para o médico: id (UUID) do astronauta"),
):
    params = {"order": "registrado_em.desc", "select": "*"}
    if s.perfil == "medico":
        if usuario_id:
            params["usuario_id"] = f"eq.{usuario_id}"
    else:
        params["usuario_id"] = f"eq.{s.id}"
    if status:
        params["status_leitura"] = f"eq.{status}"
    cliente = sb(request)
    try:
        linhas = await cliente.selecionar("exames_imagem", s.token, params)
    except SupabaseErro as e:
        raise traduzir(e, "exames-imagem-lista")
    return [await enriquecer_exame(cliente, s.token, l) for l in linhas]


@app.patch("/exames-imagem/{exame_id}/parecer", tags=["medico"])
async def dar_parecer(exame_id: int, corpo: Parecer, request: Request, s: Sessao = Depends(medico)):
    cliente = sb(request)
    try:
        linhas = await cliente.atualizar("exames_imagem", s.token, {"id": f"eq.{exame_id}"}, {
            "status_leitura": corpo.status_leitura.value,
            "parecer_medico": corpo.parecer_medico.strip(),
            "avaliado_por": s.id,
        })
    except SupabaseErro as e:
        raise traduzir(e, "parecer")
    if not linhas:
        raise falha(404, "Exam not found.")
    return await enriquecer_exame(cliente, s.token, linhas[0])


# ---------------------------------------------------------------------------
# Check-in diário: humor, estresse, enjoo e SANS (lacunas 9, 11 e 12)
# ---------------------------------------------------------------------------

class Avaliacao(BaseModel):
    humor_escala: int = Field(ge=1, le=5)
    estresse_escala: int = Field(ge=1, le=5)
    enjoo_gravidade_escala: int = Field(0, ge=0, le=5)
    sans_visao_turva: bool = False
    sans_complexo_b_tomado: bool = False
    sans_manguito_coxa_usado: bool = False
    teste_equilibrio_aprovado: bool = True
    notas_privadas: Optional[str] = Field(None, max_length=2000)


def enriquecer_avaliacao(linha):
    if not linha:
        return linha
    return {
        **linha,
        "humor": regras.rotulo_escala(regras.ESCALA_HUMOR, linha.get("humor_escala"), 5),
        "estresse": regras.rotulo_escala(regras.ESCALA_ESTRESSE, linha.get("estresse_escala"), 5),
        "enjoo": regras.rotulo_escala(regras.ESCALA_ENJOO, linha.get("enjoo_gravidade_escala"), 5),
    }


@app.put("/avaliacoes-diarias/hoje", tags=["astronauta"])
async def checkin(corpo: Avaliacao, request: Request, s: Sessao = Depends(sessao)):
    linha = {**corpo.model_dump(), "usuario_id": s.id, "data_registro": date.today().isoformat()}
    try:
        gravada = await sb(request).inserir("avaliacoes_diarias", s.token, linha, conflito="usuario_id,data_registro")
    except SupabaseErro as e:
        raise traduzir(e, "avaliacao")
    return enriquecer_avaliacao(gravada)


@app.get("/avaliacoes-diarias", tags=["astronauta", "medico"])
async def listar_avaliacoes(
    request: Request,
    s: Sessao = Depends(sessao),
    usuario_id: Optional[UUID] = Query(None, description="Só para o médico: id (UUID) do astronauta"),
    dias: int = Query(30, ge=1, le=365),
):
    alvo = usuario_id if (usuario_id and s.perfil == "medico") else s.id
    desde = (date.today() - timedelta(days=dias - 1)).isoformat()
    try:
        linhas = await sb(request).selecionar("avaliacoes_diarias", s.token, {
            "usuario_id": f"eq.{alvo}", "data_registro": f"gte.{desde}",
            "order": "data_registro.desc", "select": "*",
        })
    except SupabaseErro as e:
        raise traduzir(e, "avaliacoes-lista")
    return [enriquecer_avaliacao(l) for l in linhas]


# ---------------------------------------------------------------------------
# Gamificação: metas do dia, sequência e conquistas (lacuna 4)
# Conquistas e sequência são calculadas aqui, não pelo front, para ninguém "se dar" conquista.
# ---------------------------------------------------------------------------

META_AGUA_ML = 2500  # padrão do schema.sql (meta_hidratacao_ml)


class Metas(BaseModel):
    hidratacao_atual_ml: int = Field(ge=0, le=10000)
    exercicio_concluido: bool = False
    sono_meta_atingida: bool = False


def conquistas_do_dia(metas: Metas, sequencia: int):
    lista = []
    if metas.hidratacao_atual_ml >= META_AGUA_ML:
        lista.append("Optimal hydration")
    if metas.exercicio_concluido and metas.sono_meta_atingida:
        lista.append("Full space routine")
    for marco in (7, 30, 100):
        if sequencia >= marco:
            lista.append(f"{marco} days in a row")
    return lista


@app.put("/gamificacao/hoje", tags=["astronauta"])
async def metas_hoje(corpo: Metas, request: Request, s: Sessao = Depends(sessao)):
    cliente = sb(request)
    hoje = date.today()
    try:
        ontem = await cliente.selecionar("gamificacao_metas", s.token, {
            "usuario_id": f"eq.{s.id}", "data_registro": f"eq.{(hoje - timedelta(days=1)).isoformat()}",
            "select": "sequencia_dias,checkin_realizado",
        })
        anterior = ontem[0] if ontem else None
        sequencia = (anterior.get("sequencia_dias") or 0) + 1 if anterior and anterior.get("checkin_realizado") else 1
        gravada = await cliente.inserir("gamificacao_metas", s.token, {
            **corpo.model_dump(),
            "usuario_id": s.id,
            "data_registro": hoje.isoformat(),
            "meta_hidratacao_ml": META_AGUA_ML,
            "checkin_realizado": True,
            "sequencia_dias": sequencia,
            "conquistas_desbloqueadas": conquistas_do_dia(corpo, sequencia),
        }, conflito="usuario_id,data_registro")
    except SupabaseErro as e:
        raise traduzir(e, "gamificacao")
    return {**gravada, "unidades": {"hidratacao_atual_ml": "mL", "meta_hidratacao_ml": "mL"}}


@app.get("/gamificacao", tags=["astronauta"])
async def historico_metas(request: Request, s: Sessao = Depends(sessao), dias: int = Query(30, ge=1, le=365)):
    desde = (date.today() - timedelta(days=dias - 1)).isoformat()
    try:
        return await sb(request).selecionar("gamificacao_metas", s.token, {
            "usuario_id": f"eq.{s.id}", "data_registro": f"gte.{desde}",
            "order": "data_registro.desc", "select": "*",
        })
    except SupabaseErro as e:
        raise traduzir(e, "gamificacao-lista")


# ---------------------------------------------------------------------------
# Body check-in: sintoma e intensidade por região do corpo (card do astronauta 3D)
# ---------------------------------------------------------------------------

class BodyCheckin(BaseModel):
    regiao_anatomica: str = Field(min_length=2, max_length=50)
    sintoma: str = Field(min_length=2, max_length=1000)
    intensidade: int = Field(ge=1, le=5)
    protocolo_acao: Optional[str] = Field(None, max_length=2000)


class Resolver(BaseModel):
    resolvido: bool = True


def enriquecer_checkin(linha):
    if not linha:
        return linha
    return {**linha, "dor": regras.rotulo_escala(regras.ESCALA_DOR, linha.get("intensidade"), 5)}


@app.post("/body-checkin", status_code=201, tags=["astronauta"])
async def registrar_sintoma(corpo: BodyCheckin, request: Request, s: Sessao = Depends(sessao)):
    linha = {k: (v.strip() if isinstance(v, str) else v) for k, v in corpo.model_dump().items() if v is not None}
    linha["usuario_id"] = s.id
    try:
        return enriquecer_checkin(await sb(request).inserir("body_checkin", s.token, linha))
    except SupabaseErro as e:
        raise traduzir(e, "body-checkin")


@app.get("/body-checkin", tags=["astronauta", "medico"])
async def listar_sintomas(
    request: Request,
    s: Sessao = Depends(sessao),
    usuario_id: Optional[UUID] = Query(None, description="Só para o médico: id (UUID) do astronauta"),
    abertos: bool = Query(False, description="Só os que ainda não foram resolvidos"),
    limite: int = Query(50, ge=1, le=500),
):
    params = {"order": "registrado_em.desc", "limit": str(limite), "select": "*"}
    if s.perfil == "medico":
        if usuario_id:
            params["usuario_id"] = f"eq.{usuario_id}"
    else:
        params["usuario_id"] = f"eq.{s.id}"
    if abertos:
        params["resolvido"] = "eq.false"
    try:
        linhas = await sb(request).selecionar("body_checkin", s.token, params)
    except SupabaseErro as e:
        raise traduzir(e, "body-checkin-lista")
    return [enriquecer_checkin(l) for l in linhas]


@app.patch("/body-checkin/{checkin_id}", tags=["astronauta"])
async def resolver_sintoma(checkin_id: int, corpo: Resolver, request: Request, s: Sessao = Depends(sessao)):
    try:
        linhas = await sb(request).atualizar(
            "body_checkin", s.token, {"id": f"eq.{checkin_id}"}, {"resolvido": corpo.resolvido}
        )
    except SupabaseErro as e:
        raise traduzir(e, "body-checkin-resolver")
    if not linhas:
        raise falha(404, "Symptom record not found.")
    return enriquecer_checkin(linhas[0])


# ---------------------------------------------------------------------------
# Médico: tripulação e prontuários
# ---------------------------------------------------------------------------

class Prontuario(BaseModel):
    paciente_id: UUID
    observacao_clinica: str = Field(min_length=3, max_length=4000)
    diagnostico: str = Field(min_length=2, max_length=500)


@app.get("/pacientes", tags=["medico"])
async def pacientes(request: Request, s: Sessao = Depends(medico)):
    try:
        linhas = await sb(request).selecionar("usuarios", s.token, {
            "perfil": "eq.paciente", "order": "nome.asc", "select": "*",
        })
    except SupabaseErro as e:
        raise traduzir(e, "pacientes")
    return [perfil_publico(l) for l in linhas]


@app.post("/prontuarios", status_code=201, tags=["medico"])
async def escrever_prontuario(corpo: Prontuario, request: Request, s: Sessao = Depends(medico)):
    try:
        return await sb(request).inserir("prontuarios_medicos", s.token, {
            "paciente_id": str(corpo.paciente_id),
            "medico_id": s.id,
            "observacao_clinica": corpo.observacao_clinica.strip(),
            "diagnostico": corpo.diagnostico.strip(),
        })
    except SupabaseErro as e:
        raise traduzir(e, "prontuario")


@app.get("/prontuarios", tags=["astronauta", "medico"])
async def listar_prontuarios(
    request: Request,
    s: Sessao = Depends(sessao),
    paciente_id: Optional[UUID] = Query(None, description="Só para o médico: id (UUID) do astronauta"),
):
    alvo = paciente_id if (paciente_id and s.perfil == "medico") else (None if s.perfil == "medico" else s.id)
    params = {"select": "*", "order": "registrado_em.desc"}
    if alvo:
        params["paciente_id"] = f"eq.{alvo}"
    try:
        return await sb(request).selecionar("prontuarios_medicos", s.token, params)
    except SupabaseErro as e:
        raise traduzir(e, "prontuarios-lista")