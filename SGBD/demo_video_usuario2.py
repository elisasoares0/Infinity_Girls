import os
import time
from datetime import date
from dotenv import load_dotenv
from supabase import create_client, Client

# Carrega as credenciais do .env na pasta raiz
load_dotenv(override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def etapa(titulo, pausa=1.5):
    print(f"\n{'─' * 62}")
    print(f"▶ {titulo}")
    print(f"{'─' * 62}")
    time.sleep(pausa)


def executar_demonstracao():
    email_teste = "usuario.teste2@astrohealth.com"
    senha_teste = "Astro2026!"
    cpf_teste = "22233344455"

    print("\n" + "=" * 62)
    print("  🚀 ASTROHEALTH — DEMONSTRAÇÃO AO VIVO DO BANCO (SUPABASE)")
    print("  👩‍🚀 Tripulante: Usuario Teste 2 | Missão: Artemis IV")
    print("=" * 62)
    time.sleep(2.0)

    # 1. AUTENTICAÇÃO / CADASTRO AUTOMÁTICO (SUPABASE AUTH + TRIGGER)
    etapa("ETAPA 1: Autenticando 'Usuario Teste 2' (Supabase Auth + RLS)", 1.5)
    try:
        res = supabase.auth.sign_up({
            "email": email_teste,
            "password": senha_teste,
            "options": {
                "data": {
                    "cpf": cpf_teste,
                    "nome": "Usuario Teste 2",
                    "missao": "Artemis IV",
                    "tipo_sanguineo": "A+"
                }
            }
        })
        user_id = res.user.id
        print(f"✅ Novo perfil criado via Trigger SQL! UID: {user_id}")
    except Exception:
        auth_res = supabase.auth.sign_in_with_password({
            "email": email_teste,
            "password": senha_teste
        })
        user_id = auth_res.user.id
        print(f"🟢 Sessão iniciada com sucesso! UID: {user_id}")
    time.sleep(2.0)

    # 2. OPÇÃO 1A: TELEMETRIA E GLICOSE EM ESTADO NORMAL (Marte Base)
    etapa("OPÇÃO 1A: Telemetria e Glicose (Estado Normal — Base em Marte)", 1.5)
    dado_normal = supabase.table("sinais_vitais").insert({
        "usuario_id": user_id,
        "ambiente_missao": "marte_base",
        "frequencia_cardiaca_bpm": 74,
        "pressao_arterial_mmhg": 118.0,
        "oxigenacao_spo2": 98.5,
        "glicose_mg_dl": 92.0,
        "cetonas_mmol": 0.4,
        "marcador_imune_status": "normal"
    }).execute().data[0]

    print(f"   • Ambiente: {dado_normal['ambiente_missao']} | FC: 74 bpm | SpO2: 98.5% | Glicose: 92 mg/dL")
    print(f"   🩵 Retorno do Trigger PostgreSQL: status_alerta = '{dado_normal['status_alerta'].upper()}'")
    time.sleep(2.5)

    # 3. OPÇÃO 1B: SITUAÇÃO DE RISCO CRÍTICO (Disparo real do Trigger NASA Red)
    etapa("OPÇÃO 1B: ⚠️ SITUAÇÃO DE RISCO EM EVA (Marte Rover)", 1.8)
    print("   ⚠️ Simulando hipóxia, taquicardia e hipoglicemia durante caminhada:")
    print("   -> FC: 142 bpm | Pressão: 194 mmHg | SpO2: 87.5% | Glicose: 56 mg/dL")
    time.sleep(1.5)

    dado_risco = supabase.table("sinais_vitais").insert({
        "usuario_id": user_id,
        "ambiente_missao": "marte_rover",
        "frequencia_cardiaca_bpm": 142,
        "pressao_arterial_mmhg": 194.0,
        "oxigenacao_spo2": 87.5,
        "glicose_mg_dl": 56.0,
        "cetonas_mmol": 1.9,
        "marcador_imune_status": "elevado"
    }).execute().data[0]

    print(f"   🔴 ALERTA CRÍTICO (NASA RED) DISPARADO PELO BANCO: status_alerta = '{dado_risco['status_alerta'].upper()}'!")
    time.sleep(3.0)

    # 4. OPÇÃO 2: UPLOAD DE ULTRASSOM NO STORAGE BUCKET PRIVADO
    etapa("OPÇÃO 2: Upload de Ultrassom Venoso (Storage Bucket Privado)", 1.5)
    arquivo_local = "ultrassom_teste.jpg"
    if not os.path.exists(arquivo_local):
        with open(arquivo_local, "wb") as tmp:
            tmp.write(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9")

    caminho_storage = f"{user_id}/ultrassom_jugular_{int(time.time())}.jpg"
    with open(arquivo_local, "rb") as f:
        supabase.storage.from_("exames-imagem").upload(
            path=caminho_storage,
            file=f,
            file_options={"content-type": "image/jpeg"}
        )

    supabase.table("exames_imagem").insert({
        "usuario_id": user_id,
        "tipo_exame": "ultrassom_venoso",
        "regiao_anatomica": "Veia Jugular Interna Direita",
        "imagem_url": caminho_storage,
        "observacao_astronauta": "Exame preventivo de fluxo venoso após EVA no rover."
    }).execute()

    print(f"   ✅ Arquivo enviado para 'exames-imagem/{caminho_storage}'")
    print("   🩺 Status inicial registrado: 'pendente' (aguardando leitura do Oficial Médico)")
    time.sleep(2.5)

    # 5. OPÇÃO 3: CHECK-IN DIÁRIO (HUMOR, ESTRESSE, GRAVIDADE E SANS)
    etapa("OPÇÃO 3: Avaliação Diária (Humor, Gravidade e Prevenção SANS)", 1.5)
    supabase.table("avaliacoes_diarias").upsert({
        "usuario_id": user_id,
        "data_registro": str(date.today()),
        "humor_escala": 4,
        "estresse_escala": 3,
        "enjoo_gravidade_escala": 2,
        "sans_visao_turva": False,
        "sans_complexo_b_tomado": True,
        "sans_manguito_coxa_usado": True
    }, on_conflict="usuario_id,data_registro").execute()

    print("   ✅ Escala psicológica (Humor 4/5 | Estresse 3/5) e enjoo gravitacional (2/5) salvos!")
    print("   👁️ Contramedidas SANS registradas: Complexo B = SIM | Manguito de Coxa = SIM")
    time.sleep(2.5)

    # 6. OPÇÃO 4: GAMIFICAÇÃO E METAS DIÁRIAS
    etapa("OPÇÃO 4: Gamificação Privada e Metas Diárias", 1.5)
    conquistas = ["Hidratação Ótima", "Rotina Espacial Completa", "7 Dias em Órbita"]
    supabase.table("gamificacao_metas").upsert({
        "usuario_id": user_id,
        "data_registro": str(date.today()),
        "hidratacao_atual_ml": 2650,
        "exercicio_concluido": True,
        "sono_meta_atingida": True,
        "checkin_realizado": True,
        "sequencia_dias": 7,
        "conquistas_desbloqueadas": conquistas
    }, on_conflict="usuario_id,data_registro").execute()

    print("   💧 Hidratação: 2.650 ml | 🏋️ Exercício: Concluído | 😴 Sono: Meta atingida")
    print(f"   🏆 Conquistas desbloqueadas: {conquistas}")
    time.sleep(2.5)

    # 7. OPÇÃO 5: CONSULTA DO HISTÓRICO PERSISTIDO NO BANCO
    etapa("OPÇÃO 5: Leitura dos Registros no PostgreSQL (Validando RLS)", 1.5)
    historico = (
        supabase.table("sinais_vitais")
        .select("ambiente_missao, frequencia_cardiaca_bpm, oxigenacao_spo2, glicose_mg_dl, status_alerta")
        .eq("usuario_id", user_id)
        .order("registrado_em", desc=True)
        .limit(2)
        .execute()
        .data
    )
    for reg in historico:
        icone = "🔴" if reg["status_alerta"] == "alerta" else "🩵"
        print(f"   {icone} {reg}")

    supabase.auth.sign_out()
    print("\n" + "=" * 62)
    print("  ✅ DEMONSTRAÇÃO FINALIZADA! Atualize as tabelas no Supabase.")
    print("=" * 62 + "\n")


if __name__ == "__main__":
    executar_demonstracao()