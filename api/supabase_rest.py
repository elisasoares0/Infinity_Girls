"""
Cliente mínimo das APIs REST do Supabase (Auth, PostgREST e Storage) com httpx.

Por que não usar o pacote `supabase` aqui: na API cada requisição precisa usar o token
da pessoa que está logada, para o RLS da Elisa continuar valendo (astronauta só vê os
próprios dados, médico vê todos). Com as chamadas REST diretas isso fica explícito:
todo pedido leva `Authorization: Bearer <token da pessoa>`.

A chave usada é a pública (anon). A API nunca usa a service_role.
"""
import httpx


class SupabaseErro(Exception):
    """Erro devolvido pelo Supabase, com o status HTTP e a mensagem crua (para log)."""

    def __init__(self, status, mensagem, codigo=None):
        super().__init__(mensagem)
        self.status = status
        self.mensagem = mensagem
        self.codigo = codigo


def _erro(resposta):
    try:
        corpo = resposta.json()
    except ValueError:
        corpo = {}
    mensagem = (
        corpo.get("msg")
        or corpo.get("message")
        or corpo.get("error_description")
        or corpo.get("error")
        or resposta.text
        or "erro desconhecido"
    )
    codigo = corpo.get("code") or corpo.get("error_code") or corpo.get("statusCode")
    return SupabaseErro(resposta.status_code, str(mensagem), str(codigo) if codigo else None)


class Supabase:
    def __init__(self, url, chave_publica, timeout=15.0):
        self.url = url.rstrip("/")
        self.chave = chave_publica
        self.http = httpx.AsyncClient(timeout=timeout)

    async def fechar(self):
        await self.http.aclose()

    def _headers(self, token=None, extra=None):
        h = {"apikey": self.chave, "Authorization": f"Bearer {token or self.chave}"}
        if extra:
            h.update(extra)
        return h

    async def _pedir(self, metodo, caminho, token=None, headers=None, **kwargs):
        resposta = await self.http.request(
            metodo, f"{self.url}{caminho}", headers=self._headers(token, headers), **kwargs
        )
        if resposta.status_code >= 400:
            raise _erro(resposta)
        if not resposta.content:
            return None
        try:
            return resposta.json()
        except ValueError:
            return resposta.text

    # ---------------- Auth ----------------

    async def cadastrar(self, email, senha, dados):
        return await self._pedir(
            "POST", "/auth/v1/signup", json={"email": email, "password": senha, "data": dados}
        )

    async def entrar(self, email, senha):
        return await self._pedir(
            "POST", "/auth/v1/token", params={"grant_type": "password"},
            json={"email": email, "password": senha},
        )

    async def renovar(self, refresh_token):
        return await self._pedir(
            "POST", "/auth/v1/token", params={"grant_type": "refresh_token"},
            json={"refresh_token": refresh_token},
        )

    async def usuario(self, token):
        return await self._pedir("GET", "/auth/v1/user", token=token)

    async def sair(self, token):
        return await self._pedir("POST", "/auth/v1/logout", token=token)

    # ---------------- Banco (PostgREST) ----------------

    async def selecionar(self, tabela, token, params=None):
        return await self._pedir("GET", f"/rest/v1/{tabela}", token=token, params=params or {})

    async def inserir(self, tabela, token, linha, conflito=None):
        """Insere e devolve a linha gravada (com o que os triggers calcularam, ex.: status_alerta).
        Com `conflito` (ex.: "usuario_id,data_registro") vira upsert."""
        prefer = "return=representation"
        params = {}
        if conflito:
            prefer += ",resolution=merge-duplicates"
            params["on_conflict"] = conflito
        dados = await self._pedir(
            "POST", f"/rest/v1/{tabela}", token=token, params=params,
            headers={"Prefer": prefer}, json=linha,
        )
        return dados[0] if isinstance(dados, list) and dados else dados

    async def atualizar(self, tabela, token, filtros, mudancas):
        dados = await self._pedir(
            "PATCH", f"/rest/v1/{tabela}", token=token, params=filtros,
            headers={"Prefer": "return=representation"}, json=mudancas,
        )
        return dados or []

    async def rpc(self, funcao, token=None, args=None):
        return await self._pedir("POST", f"/rest/v1/rpc/{funcao}", token=token, json=args or {})

    # ---------------- Storage ----------------

    async def enviar_arquivo(self, bucket, caminho, conteudo, tipo, token):
        return await self._pedir(
            "POST", f"/storage/v1/object/{bucket}/{caminho}", token=token,
            headers={"Content-Type": tipo, "x-upsert": "false"}, content=conteudo,
        )

    async def link_assinado(self, bucket, caminho, token, segundos=600):
        dados = await self._pedir(
            "POST", f"/storage/v1/object/sign/{bucket}/{caminho}", token=token,
            json={"expiresIn": segundos},
        )
        relativo = (dados or {}).get("signedURL") or (dados or {}).get("signedUrl")
        if not relativo:
            return None
        return f"{self.url}/storage/v1{relativo}" if relativo.startswith("/") else relativo
