# AstroHealth API

A ponte entre o front (`app/`) e o banco no Supabase. É feita em Python com FastAPI e fica em cima das tabelas, dos triggers e do RLS que a Elisa já criou.

Cada requisição usa o token da pessoa logada, então o RLS continua decidindo quem vê o quê: o astronauta vê só os próprios dados e o médico vê os de todos. A API usa só a chave pública (anon), nunca a service_role.

## Antes de rodar (uma vez, no painel do Supabase)

1. **SQL Editor:** se o banco ainda não existe, rode `SGBD/schema.sql`. Cuidado: ele começa apagando todas as tabelas, então não rode de novo num banco com dados.
2. **SQL Editor:** rode `SGBD/ajustes_api.sql`. Ele não apaga nada e pode rodar mais de uma vez:
   - corrige o CHECK do `nasa_id`, que recusava o CRM do jeito que o front grava (`CRM-SP 123456`, `CRM 123456`);
   - corrige o trigger de cadastro: `CRM 123456` virava paciente, e a data de nascimento não era gravada;
   - acrescenta `sexo` em `usuarios`, a pressão sistólica e diastólica em `sinais_vitais` e `descricao_imagem` em `exames_imagem`.
3. **Authentication → Providers → Email:** desligue **Confirm email**. O login usa um e-mail interno (`ast_1234@astrohealth.nasa`), igual ao script da Elisa, e ninguém receberia a confirmação.
4. **Storage:** o bucket privado `exames-imagem` precisa de políticas para o astronauta enviar arquivos na pasta dele e para o médico ler todas. O script da Elisa já usa esse bucket, então as políticas provavelmente existem, mas elas não estão no `schema.sql`.

## Rodar

```bash
cd api
python -m venv .venv
# Windows: .venv\Scripts\activate    |  Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # e preencha SUPABASE_URL e SUPABASE_KEY (ou ela usa o SGBD/.env)
uvicorn main:app --reload --port 8000
```

Abra **http://localhost:8000/docs**: dá para testar todas as rotas por ali. Clique em **Authorize** e cole o `access_token` que o login devolveu.

Os testes das regras não precisam de internet:

```bash
python -m unittest discover -s tests -v
```

## Rotas

Todas, menos cadastro, login, renovar e `/saude`, exigem o header `Authorization: Bearer <access_token>`.

| Método | Rota | Quem usa | O que faz |
| --- | --- | --- | --- |
| GET | `/saude` | todos | Confere se a API está no ar |
| POST | `/auth/cadastro` | todos | Cria a conta com os campos do front: `idNumber`, `name`, `password`, `birthDate`, `sex` (só astronauta), `bloodType` |
| POST | `/auth/login` | todos | `idNumber` (AST-/CRM, nas mesmas formas que o front aceita) + `password`. Devolve `access_token`, `refresh_token` e `user` |
| POST | `/auth/renovar` | todos | Troca o `refresh_token` por um token novo |
| POST | `/auth/sair` | logado | Encerra a sessão |
| GET | `/eu` | logado | Perfil de quem está logado |
| POST | `/sinais-vitais` | astronauta | Registra os sinais (glicose é obrigatória). Também aceita temperatura, sono e nutrição. Volta com `status_alerta` calculado pelo trigger da Elisa |
| GET | `/sinais-vitais` | os dois | Histórico. O médico pode filtrar por `?usuario_id=` |
| POST | `/exames-imagem` | astronauta | Upload do ultrassom (multipart): `arquivo`, `regiao_anatomica`, `descricao_imagem` (obrigatório) |
| GET | `/exames-imagem` | os dois | Lista com link temporário da imagem (10 min). O médico usa `?status=pendente` |
| PATCH | `/exames-imagem/{id}/parecer` | médico | `status_leitura` (`normal`, `atencao`, `critico`) + `parecer_medico` |
| POST | `/body-checkin` | astronauta | Sintoma por região do corpo: `regiao_anatomica`, `sintoma`, `intensidade` (1 a 5) |
| GET | `/body-checkin` | os dois | Histórico; `?abertos=true` mostra só os não resolvidos |
| PATCH | `/body-checkin/{id}` | astronauta | Marca como resolvido |
| PUT | `/avaliacoes-diarias/hoje` | astronauta | Check-in do dia: humor, estresse, enjoo e SANS. Repetir no mesmo dia atualiza |
| GET | `/avaliacoes-diarias` | os dois | Últimos `?dias=30` |
| PUT | `/gamificacao/hoje` | astronauta | Metas do dia. Sequência e conquistas são calculadas pela API |
| GET | `/gamificacao` | astronauta | Histórico de metas |
| GET | `/pacientes` | médico | Lista os astronautas |
| POST | `/prontuarios` | médico | Escreve um prontuário |
| GET | `/prontuarios` | os dois | O astronauta vê os seus; o médico filtra por `?paciente_id=` |

## Acessibilidade nas respostas

- **Status sempre em texto**, nunca só a cor: `"status": {"value": "alerta", "label": "Critical alert", "level": "danger"}`. O front usa `label` no texto e `level` na cor.
- **Escalas com rótulo:** `"humor": {"value": 4, "max": 5, "label": "Good", "text": "4 of 5: Good"}`.
- **Unidades junto dos valores:** `"unidades": {"glicose_mg_dl": "mg/dL", ...}`.
- **Imagens com texto alternativo:** `descricao_imagem` é obrigatório no upload e volta como `imagem_alt`.
- **Erros legíveis**, sempre no mesmo formato, para o front mostrar e o leitor de tela anunciar:
  ```json
  {"detail": {"message": "Some fields are missing or invalid.",
              "fields": {"idNumber": "Enter an astronaut ID like AST-1234 or a medical license (CRM) like CRM-SP 123456."}}}
  ```
  As mensagens estão em inglês porque o app é todo em inglês.

## Exemplo para o front (fetch)

```js
const API = "http://localhost:8000";

async function api(caminho, { metodo = "GET", corpo, token } = {}) {
    const resposta = await fetch(API + caminho, {
        method: metodo,
        headers: {
            ...(corpo ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const dados = resposta.status === 204 ? null : await resposta.json();
    if (!resposta.ok) throw dados.detail; // { message, fields }
    return dados;
}

// login
const sessao = await api("/auth/login", { metodo: "POST", corpo: { idNumber: "AST-0427", password: "Mission2026" } });

// registrar sinais vitais
const leitura = await api("/sinais-vitais", {
    metodo: "POST",
    token: sessao.access_token,
    corpo: {
        ambiente_missao: "marte_base",
        frequencia_cardiaca_bpm: 74,
        pressao_sistolica_mmhg: 118,
        pressao_diastolica_mmhg: 76,
        oxigenacao_spo2: 98.5,
        glicose_mg_dl: 92,
    },
});
console.log(leitura.status.label); // "Normal" ou "Critical alert"
```

**Offline:** o app funciona sem conexão, e isso precisa continuar. O front deve salvar no aparelho primeiro e mandar para a API quando houver conexão, como o `crew-link.js` já faz com os alertas.

## Pendências

- **Login: decisão do time.** O banco usa o próprio ID como login (`AST-0427` + senha). O front ainda entra pelo NASA ID (`hsilva`) e guarda o AST/CRM em outro campo. A API segue o banco, então a tela de login do front precisa pedir o ID em vez do NASA ID.
- As contas de demonstração (`AST-0427`, `AST-0388` e `CRM-SP 123456`) ainda não existem no Supabase. É só cadastrá-las pelo `/docs` com a senha `Mission2026`.
- A API ainda não está hospedada. Para o front publicado no Firebase chamar a API, ela precisa ir para um serviço como Render ou Railway, e o endereço entra em `CORS_ORIGINS`.
