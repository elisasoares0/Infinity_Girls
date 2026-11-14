# CLAUDE.md

Diretrizes base para este projeto. Siga todas as regras abaixo ao gerar ou editar código.

---

## 1. Idioma

- **Código em inglês**: nomes de classes, variáveis, funções, arquivos, comentários no código e mensagens de commit.
- **Respostas em português**: toda explicação, resumo ou conversa com o usuário deve ser em português (pt-BR).
- **Planos em português**: todo plano de implementação é escrito em português; o código continua em inglês.

---

## 2. Nomenclatura de classes (BEM)

Use o padrão **BEM** (Block, Element, Modifier):

| Parte    | Sintaxe                     | Exemplo                 |
|----------|-----------------------------|-------------------------|
| Block    | `.block`                    | `.hero`                 |
| Element  | `.block__element`           | `.hero__title`          |
| Modifier | `.block--modifier`          | `.button--primary`      |
| Element + Modifier | `.block__element--modifier` | `.form__input--ddd` |

Regras:
- Nomes em inglês, minúsculos, palavras separadas por hífen (`.product-card__price`).
- Elementos nunca encadeiam outros elementos (`.card__body__title` ❌ → `.card__title` ✅).
- Modificadores são sempre usados **junto** com a classe base no HTML:
  ```html
  <input class="form__input form__input--ddd" type="text">
  ```

---

## 3. Estrutura obrigatória das seções

Toda seção deve seguir esta estrutura, onde `section-name` é o nome da seção:

```html
<section class="section-name">
    <div class="section-name__container">
        <!-- content -->
    </div>
</section>
```

Exemplo:

```html
<section class="hero">
    <div class="hero__container">
        <h1 class="hero__title">Title</h1>
        <p class="hero__text">Text</p>
    </div>
</section>
```

### 3.1 Comportamento responsivo do `__container`

Abordagem **mobile-first**:

| Resolução        | Regra do `__container`                                        |
|------------------|---------------------------------------------------------------|
| 414px (base)     | `padding-left` / `padding-right`: **4%**                      |
| 768px            | `padding-left` / `padding-right`: **6%**                      |
| Desktop (≥1200px)| `padding-left` / `padding-right`: **0**, `width: 1140px`, centralizado na section |

> O breakpoint desktop usa `1200px` para que o container de 1140px nunca encoste nas bordas nem gere scroll horizontal.

```css
/* Base — 414px */
.hero__container {
    padding-left: 4%;
    padding-right: 4%;
}

/* Tablet — 768px */
@media (min-width: 768px) {
    .hero__container {
        padding-left: 6%;
        padding-right: 6%;
    }
}

/* Desktop */
@media (min-width: 1200px) {
    .hero__container {
        width: 1140px;
        padding-left: 0;
        padding-right: 0;
        margin-left: auto;
        margin-right: auto;
    }
}
```

---

## 4. Regras de CSS

### 4.1 Classes estilizadas separadamente

Cada classe deve ser estilizada **isoladamente**. **Não** use seletores descendentes/combinados entre classes.

❌ **Errado** (classes em conjunto):

```css
.form__row .form__input {
    flex: 1 1 0;
    min-width: 0;
}

.form__row .form__input--ddd {
    max-width: 80px;
}
```

✅ **Correto** (classes separadas):

```css
.form__row {
    display: flex;
    gap: 16px;
}

.form__input {
    flex: 1 1 0;
    min-width: 0;
}

.form__input--ddd {
    max-width: 80px;
}
```

### 4.2 Boas práticas gerais

- Não estilizar por tag (`section h2 {}`) nem por ID (`#hero {}`); sempre por classe BEM.
- Evitar `!important`.
- **Espaçamento entre elementos irmãos via `gap`, nunca `margin-top`/`margin-bottom`**: agrupe os irmãos em uma `div` wrapper (elemento BEM, ex.: `.solutions__content`) com `display: flex` + `gap`. O agrupamento segue os frames de auto-layout do Figma — cada frame com gap vira um wrapper com o mesmo gap.
  ```html
  <div class="solutions__content">
      <h3 class="solutions__card-title">Title</h3>
      <p class="solutions__card-text">Text</p>
  </div>
  ```
  ```css
  .solutions__content {
      display: flex;
      flex-direction: column;
      gap: 8px;
  }
  ```
- Media queries agrupadas por classe ou ao final do arquivo, sempre mobile-first (`min-width`).
- Unidades: `px` para bordas e tamanhos fixos, `%`/`rem` para espaçamentos e fontes quando fizer sentido.
- Uma propriedade por linha, indentação de 4 espaços.

---

## 5. Performance e otimização (meta: PageSpeed ≥ 90/100)

Todo código deve ser escrito pensando em performance, com meta mínima de **90/100 no PageSpeed Insights, tanto em mobile quanto em desktop**. O mobile é o mais exigente e deve ser a prioridade.

### 5.1 Métricas-alvo (Core Web Vitals)

| Métrica | Meta |
|---------|------|
| LCP (Largest Contentful Paint) | ≤ 2.5s |
| CLS (Cumulative Layout Shift) | ≤ 0.1 |
| INP (Interaction to Next Paint) | ≤ 200ms |
| TBT (Total Blocking Time) | ≤ 200ms |
| FCP (First Contentful Paint) | ≤ 1.8s |

### 5.2 HTML

- HTML semântico e enxuto; evitar `div` desnecessárias e aninhamento profundo.
- Declarar `lang`, `charset` e `viewport` no `<head>`:
  ```html
  <html lang="pt-BR">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ```
- Ordem no `<head>`: meta tags → preconnect/preload → CSS crítico → CSS restante → scripts com `defer`.
- Usar `preconnect` para domínios externos essenciais (fontes, CDN):
  ```html
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ```
- Fazer `preload` apenas do recurso do LCP (imagem principal do hero) e da fonte principal — nunca de tudo.

### 5.3 Imagens

- Formatos modernos: **WebP** ou **AVIF**, com fallback quando necessário via `<picture>`.
- Sempre definir `width` e `height` (evita CLS).
- Imagens abaixo da dobra: `loading="lazy"` e `decoding="async"`.
- Imagem do LCP (geralmente o hero): **nunca** lazy; usar `fetchpriority="high"`.
- Servir tamanhos responsivos com `srcset` e `sizes`, alinhados aos breakpoints do projeto (414 / 768 / 1140):
  ```html
  <img
      class="hero__image"
      src="hero-768.webp"
      srcset="hero-414.webp 414w, hero-768.webp 768w, hero-1140.webp 1140w"
      sizes="(min-width: 1200px) 1140px, 100vw"
      width="1140"
      height="640"
      alt="Description"
      fetchpriority="high">
  ```
- Ícones e ilustrações simples em **SVG** (inline quando pequenos e reutilizados poucas vezes).
- Comprimir todas as imagens antes de subir (qualidade ~75–85 para WebP).

### 5.4 Fontes

- Preferir fontes do sistema ou no máximo **2 famílias** e poucos pesos.
- Hospedar localmente em **WOFF2** sempre que possível.
- Usar `font-display: swap`:
  ```css
  @font-face {
      font-family: "Inter";
      src: url("/fonts/inter-400.woff2") format("woff2");
      font-weight: 400;
      font-display: swap;
  }
  ```
- Fazer `preload` só da fonte usada acima da dobra.
- Definir fallback com métricas próximas para reduzir CLS (`size-adjust` quando necessário).

### 5.5 CSS

- **Nunca usar `<style>` nem atributo `style=""` no HTML.** Todo CSS fica em arquivos `.css` separados, linkados no `<head>` (arquivos pequenos e por página).
- Remover CSS não utilizado; não importar frameworks inteiros para usar poucas classes.
- Minificar em produção.
- Não usar `@import` dentro de CSS (cria cadeia de requisições).
- Animar apenas `transform` e `opacity` (evitar animar `width`, `height`, `top`, `left`, `margin`).
- Reservar espaço para elementos que carregam depois (banners, embeds, imagens) com `aspect-ratio` ou dimensões fixas:
  ```css
  .video__frame {
      aspect-ratio: 16 / 9;
      width: 100%;
  }
  ```
- Usar `content-visibility: auto` em seções longas abaixo da dobra quando fizer sentido:
  ```css
  .testimonials {
      content-visibility: auto;
      contain-intrinsic-size: auto 800px;
  }
  ```

### 5.6 JavaScript

- **JavaScript mínimo**: só usar JS quando HTML/CSS não resolverem.
- **Base em JavaScript puro (vanilla), com bibliotecas só quando trazem algo que o JS nativo não faz bem** (desde 13/11/2026). Toda biblioteca precisa ser **gratuita** (nada de serviço ou API paga), ter licença compatível e versão fixa no `package.json`, ficar **local** em `assets/vendor/<lib>/` com o `LICENSE` ao lado (empacotada por `node tools/vendor.js`, nunca de CDN), carregar tarde (depois do `load` ou sob demanda) e não derrubar o PageSpeed (≥ 90). Nada de frameworks de interface (jQuery, React etc.).
- **Bibliotecas em uso:** Three.js (abaixo, astronauta 3D) e o **Firebase JS SDK** (Apache-2.0: `initializeApp`, Auth anônimo e Firestore com cache offline), num único módulo ESM em `assets/vendor/firebase/firebase.js`, carregado por `assets/js/crew-link.js` só depois do `load`, com sessão e em voo. Ferramentas de desenvolvimento (não vão para o `dist/`): esbuild, Playwright e axe-core.
- **Regra de segurança da IA:** o que o assistente de voz diz numa emergência é **determinístico**: sai dos modelos de cada cenário e dos guias (`assets/js/guides.js`), com os valores medidos. Nenhum modelo de linguagem decide conduta numa emergência; se um modelo for usado (perguntas livres, fase 2), ele só responde com base nos guias e com o aviso "not a medical device".
- **Única exceção: Three.js** (r170, `assets/vendor/three/three.module.min.js`, licença MIT ao lado), só para o astronauta 3D da home, com os addons `GLTFLoader` (+ `BufferGeometryUtils`), `DRACOLoader` (+ decodificador WASM em `libs/draco/gltf/`) e `RoomEnvironment` em `assets/vendor/three/addons/`, com o import `"three"` trocado por caminho relativo (sem import map). Tudo local (offline), carregado com `import()` depois do `load` e só para perfis de astronauta. Nenhuma outra biblioteca.
- Scripts sempre com `defer` (ou `type="module"`); nunca bloqueando o `<head>`. Única exceção: o `<script data-theme-init>` inline (uma linha, escrito por `tools/chrome.js`), que antes da primeira pintura define o tema (para a página não piscar clara) e põe no `<html>` a sessão, o perfil e a fase (`data-session`, `data-profile`, `data-phase`, a mesma conta de `App.getPhase()`). O `base.css` usa esses atributos para esconder o que não é do perfil ou da fase já na primeira pintura, e `applyPhases` (app.js) os reescreve com o resultado do JS: nada se mexe quando os scripts rodam (CLS ≈ 0).
- Scripts de terceiros (analytics, pixels, chat) carregados de forma tardia, após interação do usuário ou `load`.
- Dividir tarefas longas (> 50ms) para não travar a thread principal.
- Event listeners de `scroll`/`resize` com `{ passive: true }` e, quando possível, trocar por `IntersectionObserver`.
- Minificar e fazer tree-shaking em produção.

### 5.7 Embeds e terceiros

- Vídeos do YouTube/Vimeo com **facade**: exibir uma miniatura e carregar o iframe só no clique.
- Mapas e iframes com `loading="lazy"`.
- Auditar cada script de terceiros; remover o que não for essencial.

### 5.8 Servidor e entrega

- Compressão **Brotli** (ou Gzip) habilitada.
- Cache longo para assets estáticos com hash no nome (`Cache-Control: max-age=31536000, immutable`).
- Servir via HTTPS com HTTP/2 ou HTTP/3 e, se possível, CDN.
- Evitar redirecionamentos encadeados.

### 5.9 Acessibilidade e boas práticas (também contam no PageSpeed)

- Todas as imagens com `alt` descritivo (ou `alt=""` se decorativas).
- Contraste de cores adequado (WCAG AA).
- Botões e links com nome acessível; áreas de toque com no mínimo 48×48px no mobile.
- Hierarquia de títulos correta (`h1` único, sem pular níveis).
- `meta description` e `title` em todas as páginas.

---

## 6. Arquitetura de arquivos

```
app/
├── index.html              ← home (URL raiz, sem redirect); usa pages/home/*
├── assets/                 ← tudo que é compartilhado entre páginas
│   ├── css/
│   │   ├── colors.css      ← SOMENTE cores (paleta da marca + aliases semânticos)
│   │   ├── spacing.css     ← SOMENTE tokens de espaçamento e raio (grade 8px)
│   │   ├── fonts.css       ← @font-face
│   │   └── base.css        ← reset + componentes globais (app-header, tab-bar, badge, help, section-head, app-footer)
│   ├── js/app.js           ← comportamento global
│   ├── fonts/  img/
└── pages/
    └── <page-name>/        ← uma pasta por página/categoria
        ├── index.html      (a home não tem: usa o index.html da raiz)
        ├── <page-name>.css
        └── <page-name>.js
```

Ordem dos CSS no `<head>`: `colors.css` → `spacing.css` → `fonts.css` → `base.css` → CSS da página.

Produção e offline:
- `node tools/build.js` gera `dist/` (CSS, JS e HTML minificados; copia só `index.html`, `sw.js`, `assets/` e `pages/`). O Firebase publica `dist/` e roda o build no `predeploy`. O código-fonte fica na raiz; nunca edite `dist/`.
- Comandos `npm` (`package.json`): `npm run vendor` (bibliotecas locais), `npm run chrome` (cabeçalho e partes comuns), `npm run serve` (servidor local na porta 8080, também para celulares na mesma rede), `npm test` (Playwright com o Chrome instalado, 414 e 1280 px: regressão de tudo o que já existe, emergência ponta a ponta com dois aparelhos no Firestore real e axe nos dois temas), `npm run test:a11y` e `npm run rules` (publica `firestore.rules`). Ao criar ou mudar uma funcionalidade, acrescente o teste em `tests/`.
- Firebase: projeto `spaceapps-infinitygirls`, plano gratuito Spark. Configuração pública do app em `assets/data/firebase-config.json` (não é segredo). Firestore só com a coleção `missions/{missionId}/alerts/{alertId}` (`firestore.rules`: ler e criar com login anônimo, atualizar só `status`, `responders`, `resolvedAt` e `updatedAt`, nunca apagar).
- `sw.js` (raiz) guarda o app shell para uso offline. Ao criar uma página ou um asset, inclua o arquivo na lista `SHELL` e suba o `CACHE_VERSION`.
- Todo horário exibido é UTC (`App.formatTime`), como nas naves.
- Fases da missão (antes do voo, durante e depois): `App.getPhase()` calcula a fase pelas datas da missão. Elementos com `data-phases="pre in post"` só aparecem nessas fases (`hidden`, garantido por `[hidden][hidden]` em `base.css`, e escondidos antes do JS pelos atributos do script de tema). Conteúdo logo abaixo de algo que os scripts desenham (os alertas, abaixo das fichas da tripulação) leva `data-after-render`: fica invisível até o `app.js` marcar `data-ready` no `<html>` (DOMContentLoaded). `.page` e `.dashboard` têm `min-height: 100vh`, para o rodapé começar abaixo da dobra. Destino e fase vêm da missão, definida pelo controle da missão: `assets/data/missions.json` (nome, destino, data de lançamento e duração; só leitura). A conta não é ligada a uma missão: no login, o grupo de rádio "Flight phase" (`App.accounts.phaseChoices()`) oferece uma missão por fase (antes, durante e depois do voo; a primeira de `missions.json` em cada fase, então a ordem do arquivo decide; "In flight" é a One-Year Mission, longa, para a grade Overall ter muitos dias). A escolha fica em `sign-in-mission` e vem marcada no próximo login; o cadastro não pede missão e abre na última escolha ou em voo. A sessão guarda uma cópia da missão (`App.getMission()`), e editar os dados no Profile mantém a fase. A fase e o dia saem das datas reais; `App.getMode()` traz `day`, `length` e `missionName` dessa missão. Ninguém edita as missões no app; o Profile mostra missão, destino, lançamento, pouso previsto, duração e fase, e lembra que a fase troca saindo e entrando de novo.
- Presentation mode (só para a apresentação): botão "Demo" no header, só com ícone (`.demo-toggle`, 48×48, nome "Presentation mode (demo)" no `aria-label` e no `title`; marcador "!" no canto quando algo está simulado, e o estado também em texto no header e no painel) abre um `<dialog>` (`.demo`: folha na base no celular, gaveta à direita a partir de 768px) gerado pelo `tools/chrome.js`. Simula destino (`mode-preview`), fase (`phase-preview`), contexto de superfície (`context-preview`, desabilitado na estação e na Terra), conexão com a Terra (`link-lost`) e sensores (`sensors`); a opção automática de cada campo diz o valor real ("Real mission: …", "From the mission dates (now …)"), sem descrição embaixo dos campos, e "Back to the real mission" limpa tudo. Enquanto destino ou fase são simulados, o app usa os números de exemplo de `MODES`, e o header acrescenta " · simulated" (também com o contexto simulado). `App.getSimulations()` lista o que está simulado. Nada disso fica no rodapé, que só tem créditos.
- Contexto de superfície (Lua e Marte): cada missão de Lua ou Marte em `missions.json` tem `surface: { fromDay, toDay }` (os de exemplo ficam em `MODES`); fora desses dias a tripulação está em trânsito (microgravidade: `App.getMode().env`). `App.getSurface()` dá `"transit"`, `"surface"` ou `null` (estação, ou na Terra); `App.getContext(member)` dá `"transit"`, `"base"`, `"rover"` ou `null`: na superfície, a tripulação do rover (`ROVER_CREW` em `app.js`) sai em dias pares da missão, das 09:00 às 13:00 UTC. Sessões antigas sem `surface` mantêm Lua = base e Marte = trânsito. O header em voo acrescenta o lugar ("Moon base", "rover traverse", "on the way to Mars", "on the way home"). No rover, a prontidão pede 85 ("Ready for the traverse" / "Stay at the base today"); nos outros contextos, 80 como antes. Elementos com `data-contexts="transit base rover"` só aparecem nesses contextos (`App.isVisible`; sem esconder antes da primeira pintura, então só abaixo da dobra, como as tarefas da base e do rover). O médico vê na ficha quem está no rover e, no alerta dessa pessoa, o tempo até a base.
- Página Learn (`pages/learn/`, "Your health risks", todos os perfis, sem aba própria): os riscos da fase ligados à pessoa. Em voo, os 5 perigos da NASA com os 17 riscos do HRP, cada um num `details.risk` (`id="risk-<id>"`, `data-risk`) com "What it does to your body", "What the app watches for you" (selo de hoje pelos sensores, `data-risk-status`, e links para a página certa), "What you can do"; risco sem sensor diz "Not measured by the app". Antes do voo, só o porquê de cada exame; depois do voo, só a readaptação. Entradas: "Learn about this risk" em cada indicador, "Why this happens in space" em cada guia de emergência (`learn` em `GUIDES`; nunca no diálogo SOS) e "Your health risks" no Profile. `#risk-<id>` abre e foca o item visível com o mesmo `data-risk` (depois do `load`); se a fase não tem esse risco, fica no topo.
- Critério para cada elemento: ajuda a pessoa a cuidar da própria saúde nesta fase e ela pode agir sobre isso? Se não, não aparece. Na Terra, o header mostra só a fase; sinal, sincronização, responsável médico, radiação, ruído e o módulo Connection são só de voo; o plano do ciclo é editável só antes do voo.
- Na Terra (antes e depois do voo), nenhum texto, alerta ou requisição de voo: o responsável médico é sempre o médico de voo (`App.getMedicalLead()`), não há clima espacial nem radiação (`data-phases="in"` / `App.isFlight()`), e status de planejamento nunca fica vermelho.
- Status de atenção ("Watch") sempre diz como sair dele: linha "Back to normal when: …" + registro dos passos + nova leitura da camisa (`.recheck` em `base.css`). Só uma medida dentro da faixa volta o status a normal; marcar os passos não apaga o alerta. Piora sobe para "Act now". Com os dois passos marcados, a camisa faz a nova leitura sozinha (`App.crew.scheduleRecheck`; 20 s na demo, cerca de 30 min a bordo). Nada que a camisa mede é digitado: com a camisa sem sinal, o app pede para recolocá-la e não há recheck até ela voltar. Os únicos campos digitados são a fita de urina no painel do médico e a glicose do glicosímetro, pelo astronauta, quando o glicosímetro não está ligado por Bluetooth (exames que nenhum sensor da camisa faz).
- Perfis (`App.getProfile()`): astronauta feminina (Cmdr. Silva), astronauta masculino (Eng. Tanaka) e médico (Dr. Okafor, oficial médico de bordo). O foco é o astronauta. Entrada por login e cadastro na própria home (sem redirect; `pages/home/auth.js`, abas "Sign in" e "Create account"); páginas internas sem sessão levam à home. Contas em `assets/js/accounts.js` (`App.accounts`): as de teste ficam em `assets/data/accounts.json` (só leitura, senha de demonstração `Mission2026`, listadas no bloco "Demo accounts" com botão que preenche o login), e as criadas ou editadas no app ficam no dispositivo (`accounts` no `App.store`, vencem o JSON pelo `nasaId`). Senha guardada como SHA-256 de `salt:senha` (`crypto.subtle`), sem servidor: não é segurança real, e a tela avisa. Cadastro pede NASA ID, nome, ID de astronauta ou CRM, data de nascimento e senha (8+ caracteres com letras e números); o ID define o papel (`AST-1234` = astronauta; `CRM-SP 123456` ou `CRM 123456/SP` = médico) e, para astronautas, o sexo escolhe o perfil `female`/`male`. Contas novas usam os dados simulados do tripulante modelo do mesmo perfil, com nome e ID próprios. A sessão (`session`) guarda o resumo da conta e `App.getProfile()` usa o nome dela; "Sign out" (`App.signOut`) apaga só a sessão. No Profile, o card "Personal data" mostra nome, NASA ID, ID ou CRM, papel, sexo, idade e nascimento, com editar dados, trocar senha e excluir conta (só contas criadas no app). Elementos com `data-profiles="female male doctor"` seguem o perfil, junto com `data-phases` (`App.isVisible`). Cada astronauta vê só o módulo do seu gênero, ligado por padrão; a home do médico é o painel da tripulação (`pages/home/crew-panel.js`; não há página separada nem aba própria; `#crew` é o destino do "Back to crew panel" da Vitals e do atalho no Profile): quem lidera (em voo), uma ficha por pessoa com perfil (nome, função, sexo, idade e fase do voo) e status do dia, busca por nome/função e chips de status (`.filter-chips`, em voo), e os alertas com guias de decisão (em voo), filtrados junto com as fichas. Antes do voo, cada ficha da tripulação tem o botão "Pre-flight exams" (`.crew__exams`, largura total) com três contadores, cada um com ícone e texto: feitos, agendados e a agendar ("due soon" em amarelo quando uma janela fecha em até 14 dias; nunca vermelho). O clique abre o painel lateral `.exam-panel` (`<dialog>` no `index.html`, `App.examPanel.open(member)` em `pages/home/exams.js`; folha na base no celular, gaveta de 480px à direita a partir de 768px, como o Presentation mode) só com os exames daquela pessoa, em To schedule (pelo fechamento da janela), Scheduled (pela data, com "Change date" e "Cancel") e Done. "Schedule" abre no item um formulário com data dentro da janela e horário (09:00, 10:30 ou 14:00 UTC). Ao fechar (botão, Esc ou toque fora), se algo mudou, `exams:change` redesenha as fichas e o foco volta ao botão da pessoa. Não existe lista de exames da tripulação inteira (repetia os mesmos nomes e confundia). O astronauta vê "Your pre-flight exams" na faixa de tarefas, só leitura (quem agenda é o médico de voo), e a lista de tarefas antes do voo fica só com o que não é exame. O teste de gravidez mostra só status e data, nunca resultado. Privacidade, tarefas e rechecagem de temperatura são salvas por pessoa (`privacy:<member>`, `tasks:<member>`, `recheck:<member>`, agendas de exame em `exams:<member>`).
- Dados novos de saúde passam por `App.records` (`assets/js/records.js`), com os nomes de tabela e coluna do backend (`../db/schema.sql`, Supabase), validados como o `CHECK` do banco, para a integração futura trocar só essa camada.
- Dados de saúde da tripulação ficam em `assets/js/crew-data.js` (`App.crew`): vitais de hoje, histórico simulado determinístico, faixas de status e alertas do oficial médico. Cada pessoa tem `sex` e `age` (simulados). Exames antes do voo: `App.crew.preflightExams(member)` (catálogo `PREFLIGHT_EXAMS` com a janela em dias antes do lançamento, tirada das pesquisas: certificação anual 365→30, audiometria 180→30, OCT 90→14, sangue/urina/saliva 60→10, QCT 60→14 só em missões de 180+ dias, DXA 45→7, conferência privada 30→3, gravidez 10→1 só para mulheres), ajustado às datas da fase (real ou simulada): janela fechada = feito, nada feito antes de a janela abrir, data agendada que passou = feito com resultado pendente. `examSummary`, `scheduleExam`, `cancelExam` e `examSlots` completam a API. Home do astronauta, Vitals e painel da tripulação leem a mesma fonte, então uma leitura feita pelo astronauta aparece para o médico.
- Monitoramento contínuo, 24 h por dia, sem registro manual: a camisa Astroskin (frequência cardíaca, pressão, SpO₂, respiração, temperatura e sono), o dispensador de água e os aparelhos de exercício enviam dados sozinhos. `app.js` dispara `health:sample` a cada 5 s (pausa com a aba oculta); as páginas atualizam os números no lugar, sem perder o foco, e o `aria-live` anuncia só mudança de status. `App.crew.series24h` dá a linha das últimas 24 h. O campo "Health sensors" do Presentation mode simula a camisa tirada ou o dispensador offline (`App.crew.sensorState`): os cards mostram "No signal" com o último valor e o pedido para recolocar a camisa (ou esperar o dispensador); não existe registro à mão.
- Lembretes (`App.reminders`, `assets/js/reminders.js`): o aviso na hora de cada tarefa fica acima da tab bar (`.reminder`), nunca rouba o foco e é anunciado por uma região `aria-live` à parte; oferece Done, In 15 min e Open. Só fala com "Speak reminders" ligado e só notifica o aparelho com permissão e com o app fora da tela (Profile, card "Reminders").
- Assistente "Ask" (`App.assistant`, `assets/js/assistant.js`): busca local (BM25 com sinônimos) só nos textos do app (guias e kit em voo, indicadores de `assets/js/health-info.js`, riscos da Learn da fase e ajuda do app). Responde citando o trecho palavra por palavra, com a fonte e o link; sem resultado, diz que não encontrou; aviso "Not a medical device" sempre visível; pergunta de emergência em voo oferece "Start SOS" primeiro.
- Tarefas da home têm chave estável (`data-task="<id>"`, salvas como `done: ["<id>", …]` em `tasks:<member>`); quem marca uma tarefa fora da lista (lembrete, check-in, glicose, ultrassom) grava a mesma chave e dispara `tasks:change`.
- Header a partir de 1200px: logo, status e botões numa linha só (o status quebra em duas linhas ao lado do logo se ficar longo; os botões não quebram). O botão de tema mostra a ação seguinte (lua + "Dark" no claro, sol + "Light" no escuro). Abaixo disso, o header empilha logo, status e botões.
- Script de tema, header (com os botões de tema, "Ask" (`.ask-toggle`, abre o assistente), Demo e emergência; abaixo de 768px tema, Ask, Demo e "Emergency guide" mostram só o ícone, com o texto como nome acessível), rodapé, tab bar e o painel do Presentation mode são gerados por `node tools/chrome.js` em todas as páginas. O rodapé é o mesmo em todas (só créditos, constante `FOOTER`); um aviso que é de uma página só vai no conteúdo dela (no `.page-intro__text`), nunca no rodapé. Ao criar uma página ou mudar a navegação, edite o script e rode-o; não edite esses blocos à mão.
- Emergência, voz e tripulação (em voo, todas as páginas; scripts comuns inseridos pelo `tools/chrome.js` logo depois do `app.js`, nesta ordem: `crew-data.js`, `guides.js`, `voice.js`, `habitat.js`, `crew-link.js`, `emergency-engine.js`):
    - `App.guides` (`assets/js/guides.js`): os guias de emergência (o primeiro é "Not responding or not breathing", com metrônomo de 110 por minuto em Web Audio e ciclo de 2 minutos falado), o `KIT` (como usar ECG, oxímetro, lanterna, desfibrilador, oxigênio, autoinjetor e torniquete, mostrado em cada passo que cita o item) e os `scenarios` (chest-pain, collapse, low-oxygen, high-fever, critical, manual), com os modelos do que a voz diz para a própria pessoa, para quem está perto e para a tripulação.
    - `App.voice` (`assets/js/voice.js`): fala com as vozes do aparelho (`speechSynthesis`, offline), fila com prioridade (emergência interrompe), legenda sempre visível (`.voice-caption`, `aria-live`), temporizador de segurança por frase, comandos de voz opcionais ("next", "repeat", "help") só onde o navegador tem reconhecimento e há conexão. O navegador só fala depois de um toque na página: até lá, o diálogo mostra "Tap to hear the instructions" e o celular vibra. Configuração no Profile (cartão "Voice assistant": ligar, velocidade, "I'm in…", testar).
    - `App.emergency` (`assets/js/emergency-engine.js`): começa uma emergência quando um sinal da própria pessoa **passa** para "Act now" (frequência cardíaca, SpO₂, respiração, pressão, temperatura) ou a respiração vai a 0, pelo botão **SOS** do header (vermelho, em voo, todos os perfis) ou pelo Presentation mode ("Emergency (in flight)": `emergency-sim`, que troca os sinais do membro da demo em `App.crew`). Na hora: a voz diz os valores e o que fazer, o alerta vai para a tripulação com a localização, e o diálogo `.sos` mostra os sinais, um passo do guia por vez (Next, Repeat, registro UTC no mesmo `emergency-log` da página de emergência), o mapa e "I'm OK, cancel the alert" (dois toques). Esc não fecha: "Minimize" deixa a faixa no header. No aparelho do médico, a simulação gera o alerta de uma tripulante (Cmdr. Silva), para mostrar o lado de quem responde.
    - `App.crewLink` (`assets/js/crew-link.js`): alertas em tempo real entre aparelhos (Firestore + `BroadcastChannel` entre abas, fila offline). O alerta mais recente de outra pessoa abre o diálogo em modo "responder" (voz para a tripulação, mapa, guia, "I'm on my way"; o médico também tem "Resolved"); os outros ficam na faixa `.crew-alert`, que é a última linha do header. Quem pediu ajuda ouve "Doctor Okafor is on the way".
    - `App.habitat` (`assets/js/habitat.js`): módulos por destino e contexto (estação; Orion a caminho da Lua; base lunar; veículo de transporte para Marte; base em Marte com estufa; as bases têm área de caminhada espacial; no rover, o módulo "Pressurized rover" fora do habitat, com kit próprio, a parceira de rover atende e a base fica a cerca de 40 min: `roverMinutes`), onde cada pessoa está (rotina UTC: sono, refeições, exercício, trabalho; corrigível em "I'm in…" por 2 h), quem atende (o oficial médico, ou o mais próximo) e o mapa SVG (`aria-hidden`, sempre com o texto equivalente).
    - Privacidade: na emergência, a localização e os sinais daquele alerta vão para a tripulação na hora; nada mais (aviso fixo na página Privacy).
    - Cada indicador explica "What to do" (sempre visível, com uma frase a mais na base e no rover: `CONTEXT_ADVICE`), "How it is measured" e "Why it matters" (num `<details>`), com "Explain out loud" e o link "Learn about this risk" (`RISKS`, para a Learn): `App.renderHealthInfo` / `App.healthInfo` / `App.healthAdvice` em `assets/js/today-ring.js`, no detalhe da Vitals e no card flutuante da home.
- Procedimentos de emergência (`pages/emergency/`): só em voo, guardados pelo service worker para funcionar sem conexão; cada passo marcado é registrado com horário UTC. Atalho "Emergency guide" no header em voo: neutro (branco, cruz de primeiros socorros) para não parecer um alarme; fica vermelho só sem ligação com a Terra. Vermelho e ícone de alerta indicam estado, nunca um atalho. Sem ligação com a Terra (`App.isLinkLost()`: offline em voo ou a simulação "Connection with Earth" do Presentation mode), um banner aparece em todas as páginas.
- Home do astronauta (`.astronaut-view`): astronauta 3D realista, o traje EMU do NASA 3D Resources (`assets/models/emu.glb`, cerca de 343 mil triângulos, malha Draco; crédito em `CREDITS.txt` e na home), carregado por `assets/js/astronaut-3d.js`. Dentro da nave ninguém usa a mochila: ao carregar, `removeGear` tira PLSS, SAFER e as correias da cintura (componentes conectados atrás das costas, cerca de 15 mil triângulos) e o controle de mão do SAFER, onde os braços pareciam apoiados (barras sob os antebraços, blocos e hastes nas mãos: peças com menos de 500 triângulos inteiras na altura das mãos, longe do meio do corpo e à frente do tronco, cerca de 1 700 triângulos), tudo por peça inteira, sem reamostrar a malha; os braços ficam livres; as frações dos pontos seguem calibradas na caixa do modelo completo e o boneco gira em torno do corpo. O arquivo exportado marca todos os materiais como vidro e vem de lado: ao carregar, a transmissão é zerada (tecido fosco, viseira dourada metálica) e a frente é calculada pela viseira. Reflexos via `RoomEnvironment`. 8 pontos de sensor ficam na superfície do traje (frações da caixa do modelo + raio de frente, que anda até acertar o traje), coloridos pelo status. O ponto escolhido vira um farol branco (núcleo branco maior, anel branco com borda Deep Blue e mira de 4 traços; o halo mantém a cor do status) e os demais ficam apagados. Arrastar gira o boneco; os botões "Turn left/right" e as setas são a alternativa ao arrasto. Tocar num ponto ou num card compacto (ícone, nome, valor e selo de status; 4 de cada lado no desktop, grade embaixo no tablet e no celular) abre um card flutuante (`.body-pop`, `role="dialog"`) com valor, linha de 24 h, o que fazer e o recheck da temperatura: em telas largas ele encaixa à direita do palco, nivelado com o ponto, e o boneco desliza para a esquerda; no celular vira uma folha na base do palco. Esc ou fechar devolvem o foco a quem abriu. O `.astronaut-view__layout` é uma faixa de espaço de ponta a ponta (sai do container com `100cqw`, a seção é `container-type: inline-size`): estrelas e limbo da Terra só em CSS (tokens `--color-space*` e `--color-earth-*`), o boneco sem caixa sobre o fundo e os cards compactos dentro da faixa como painéis de vidro, com selos de status opacos para não depender do fundo. A prontidão (nota /100 + selo, como "Ready for EVA") fica no topo da faixa, centralizada acima do boneco em todas as larguras (área `readiness` do grid; no desktop, entre as duas colunas de cards), num painel de vidro como os cards compactos. O canvas é `aria-hidden`: os cards são a interface acessível. Sem WebGL, fica o aviso e os cards.
- Visão "hoje" da Vitals: componente `App.todayRing` (`assets/js/today-ring.js`), na aba Today. São 8 cápsulas-botão com ícone em volta da prontidão, detalhe do indicador (24 h e 7 dias), aviso com ação e Summary em colunas. O mesmo arquivo exporta `App.signalText`, `App.ringIcon`, `App.drawSeries` e `App.healthAdvice`, usados pela home.
- Sinais vitais (`pages/vitals/`): abas Today (anel de status), Weekly (colunas por dia, cada uma um botão que mostra as leituras do dia) e Overall (chips de filtro) (grade de dias, ou de semanas acima de 365 dias: lista HTML `App.charts.heatmap`, `aria-hidden`, com o número do dia ou da semana dentro de cada quadrado, 12px Bold, quadrados de no mínimo 28px; atenção e crítico levam uma marca no canto em vez de hachura, para não cobrir o número; o dia do pouso tem borda grossa; a tabela é a versão acessível). Status sempre com ícone, texto e textura além da cor; cores de status validadas com o validador da skill dataviz.
- Dado NASA ao vivo: DONKI (clima espacial: SEP e CMEAnalysis). O app mostra só a saúde de quem o usa: nada de conteúdo informativo extra, como galerias de fotos.
- Gráficos: `App.charts` (linha, barras, tabela), sempre com resumo em texto e tabela de dados. O SVG fica `aria-hidden`.

---

## 7. Design tokens da marca

### 7.1 Cores (`assets/css/colors.css`)
- Paleta oficial com os nomes da marca: `--blue-yonder #2E96F5`, `--neon-blue #0960E1`, `--electric-blue #0042A6`, `--deep-blue #07173F`, `--rocket-red #E43700`, `--martian-red #8E1100`, `--neon-yellow #EAFE07`, `--white #FFFFFF`.
- Nenhum hex fora de `colors.css`; os demais arquivos usam só os aliases semânticos (`--color-*`).
- **Tema claro (white):** fundo branco, texto Deep Blue, primária Electric Blue (links, seletor ativo, foco) e gráficos em Neon Blue.
- Status (badges são chips tonais, nunca parecidos com botão): ok = fundo Blue Yonder 12% + texto e borda Electric Blue, atenção = Neon Yellow + texto e borda Deep Blue (borda do card e gráfico em Rocket Red), crítico = Martian Red + texto branco. Sempre com ícone e texto.
- Checkbox e rádio: o quadrado fica ao lado do texto e centralizado na altura do bloco de texto (`label.choice` > `input.choice__input` + `.choice__label` ou `.choice__content`, que encolhem com `min-width: 0`; texto extra, como "Done at", vai dentro de `.choice__content`, nunca como irmão com quebra de linha).
- Texto e borda de erro de formulário usam `--color-error` (Martian Red no claro, `--rocket-red-light` no escuro).
- Botões (`.button` sempre com modificador): primário = Electric Blue sólido + texto branco (hover Deep Blue), secundário = branco com borda e texto Electric Blue, terciário = só texto Electric Blue sublinhado. Rótulo dentro de `.button__text` para centralizar na altura das versais.
- Rocket Red e Blue Yonder só em acentos e gráficos, nunca em texto (contraste < 4.5:1 sobre branco). Neon Yellow nunca como texto ou linha sobre branco.
- Sombras (`--shadow-*`) também ficam em `colors.css`.
- **Tema escuro** (`:root[data-theme="dark"]` em `colors.css`): fundo Deep Space, cards Deep Blue, texto branco (secundário branco 72%), primária, links e gráficos em Blue Yonder, foco e hover em `--blue-yonder-light`, chip OK opaco `--deep-blue-ok` com texto Blue Yonder claro. Amarelo e vermelho de status, faixas de espaço e palco 3D iguais aos do claro. Contrastes anotados no arquivo e validados (axe sem violações nos dois temas).
    - Todo alias novo precisa de valor nos dois temas. Texto sobre fundo primário ou de gráfico usa `--color-on-primary` (branco no claro, Deep Space no escuro); `--color-text-inverse` é sempre branco, só sobre Martian Red e faixas escuras. O 3D lê `--color-3d-light`, que não muda com o tema. O logo é invertido por `--logo-filter`.
    - Botão de tema no header (`.theme-toggle`, todas as páginas, fases e perfis; texto visível a partir de 768px) com a ação seguinte: lua + "Dark" no claro, sol + "Light" no escuro, e nome "Switch to dark theme" / "Switch to light theme" no `aria-label` e no `title` (sem `aria-pressed`, porque o nome muda). Sem escolha salva, segue `prefers-color-scheme` (e acompanha a mudança do aparelho); com escolha, salva em `theme` (`App.setTheme`, `App.getTheme`, evento `theme:change`). O `theme-color` segue `--color-bg`.

### 7.1.1 Decorações
- Patterns da marca (`brand/Patterns/`) convertidos em WebP transparente e tingido: `assets/img/deco-*.webp` (Orbits, Rosette, Waves, Fiduciaries). O Code (binário) é a exceção: `deco-code.webp` é opaco, com o fundo do hero, o tingimento e o degradê já aplicados (o alpha do texto deixava o arquivo com mais de 100 KB). Hoje sem uso (era o hero do antigo painel médico).
- Aplicados só via `::before` com `background-image`, `pointer-events: none` e opacidade entre 0.14 e 0.3, sem nunca comprometer o contraste do texto. A seção decorada recebe `overflow: hidden`.
- Ondas e linhas: os SVGs em `assets/img/wave-*.svg` têm só a forma (sem cor) e entram como `mask-image` (com `-webkit-`). A cor vem dos tokens `--color-wave-*`, `--color-deco-line*` e `--color-mask`.
    - `wave-edge-top` / `wave-edge-bottom` fecham faixas em onda, com altura `--wave-height` somada ao padding para nada ficar na curva: a faixa de espaço do astronauta (topo e base), a base do `.page-intro`, o topo de `.modules` e o topo do rodapé.
    - A onda do topo do rodapé sobe sobre o fim do `<main>`, com altura `--footer-wave` (`spacing.css`, 40px, ou 56px a partir de 768px). Todo fim de página reserva esse espaço: `.page`, `.modules__container` e `.dashboard--crew` (home do médico, que termina nos alertas e não numa faixa colorida) somam `--footer-wave` ao padding de baixo.
    - `wave-lines` / `wave-lines-flip` são as linhas de órbita ao fundo do `main` (`.page::before`, `.dashboard::before`, opacidade 0.3).
    - Heros (`.page-intro`, `.greeting`, `.welcome`) ficam limpos: só o tom azul claro opaco (tinta sobre o fundo, então as linhas de órbita não cruzam o título), sem nenhuma decoração.
    - Estrelas só sobre os fundos azul-escuros (faixa do astronauta e `.tasks`), nunca no fundo claro: `assets/img/stars.svg` é um tile de máscara (pontos, estrelas de 4 pontas e uma constelação) em branco, em duas camadas de tamanhos e deslocamento diferentes (320 e 530 px; 400 e 660 px no tablet) para o padrão não se repetir à vista.
    - "Health tasks today" (`.tasks`) é uma faixa escura de espaço com bordas em onda: títulos em branco (`.section-head__subtitle--inverse`) e cards de tarefa brancos; a tarefa feita usa `--color-surface-done` (tom sólido, não translúcido).
    - Em `forced-colors`, as decorações somem e as bordas ficam retas.

### 7.2 Espaçamento (`assets/css/spacing.css`)
- Grade de 8px: `--space-1` (4px) até `--space-8` (64px). Nenhum `gap` ou `padding` em px solto.
- Proximidade: 4px dentro do componente, 8–12px dentro do grupo, 16–24px entre cards e 48–64px entre seções.
- Parágrafos com `max-width: var(--text-max)` (65ch).

### 7.3 Tipografia
- Títulos: **Fira Sans** Black (900) e Bold (700). Corpo: **Overpass** Regular, Bold e Italic.
- WOFF2 locais em `assets/fonts/`, com preload só de Fira Sans 900 e Overpass 400. A Overpass traz o "·" (U+00B7) com largura zero; o `unicode-range` dela pula esse caractere, que vem do fallback (sem isso, " · " vira " ·palavra").
- Escala única de tamanhos em `fonts.css` (`--text-*`); nenhum `font-size` solto em rem ou px (só os rótulos dos gráficos SVG, em 12px). Nada abaixo de 12px:
    - `--text-xs` 12px (selos, rótulos em caixa alta), `--text-sm` 14px (meta, legendas), `--text-base` 16px (corpo, botões, subtítulo dentro de card), `--text-lg` 18px (título de card, Bold 700).
    - `--text-h2` 22→26px (título de seção, Black 900), `--text-h1` 28→36px (título da página, Black 900); mudam sozinhos a partir de 768px.
    - Números: `--text-value` 24px (leitura dentro de card), `--text-display` 36px (número principal do card), `--text-score` 40→48px (prontidão). Cards irmãos usam a mesma estrutura de valor: `p.x__value` (flex, baseline, gap `--space-2`) > `strong.x__number` (`--text-display`, 900) + `span.x__unit` (`--text-base`, cor secundária), como em Body mass e Radiation dose na home.
    - Selo ao lado de número grande (prontidão): número e unidade com `text-box: trim-both cap alphabetic`, para o selo centralizar nos algarismos e não na caixa da linha.
    - Elementos do mesmo nível usam o mesmo token, qualquer que seja a tag (todo título de card é `--text-lg` 700).

---

## 8. Usabilidade e acessibilidade (obrigatório)

- Seguir **WCAG 2.2 nível AA** e as **10 heurísticas de Nielsen** em toda interface.
- Contraste ≥ 4.5:1 para texto e ≥ 3:1 para elementos gráficos; nunca transmitir informação só por cor.
- Foco visível em todo elemento interativo; alvos de toque com no mínimo 48×48px (links soltos numa frase também: `display: inline-flex` + `min-height`). O foco nunca fica escondido sob o header fixo ou a tab bar: `html { scroll-padding }` usa as alturas medidas por `app.js` (`--header-height`, `--tab-bar-height`).
- Navegação por Tab testada com teclas reais: toda página e perfil dá a volta completa, sem armadilha, com anel de foco visível em cada parada. Grupos de rádio contam como uma parada (setas dentro do grupo).
- Estado do sistema sempre visível (sincronização, modo, carregamento) e mudanças anunciadas com `aria-live`.
- Nada de links mortos (`href="#"`): funcionalidades futuras aparecem desabilitadas com o selo "Coming soon".
- Termos técnicos com ajuda contextual (`<details>`), e alertas com explicação e ação sugerida.
- Validar com axe-core (0 violações) e Lighthouse antes de entregar.

---

## 9. Checklist antes de entregar

- [ ] Código (classes, variáveis, comentários) em inglês.
- [ ] Resposta ao usuário em português.
- [ ] Toda seção tem `section.section-name` + `div.section-name__container`.
- [ ] `__container` com 4% / 6% / 1140px conforme as resoluções.
- [ ] Classes seguem BEM.
- [ ] Nenhum seletor combinando duas classes (`.a .b`).
- [ ] Imagens em WebP/AVIF, com `width`/`height`, `srcset` e lazy load abaixo da dobra.
- [ ] Imagem do LCP sem lazy e com `fetchpriority="high"`.
- [ ] Fontes em WOFF2 com `font-display: swap`.
- [ ] JavaScript puro; bibliotecas só gratuitas, locais em `assets/vendor/`, com licença e carregamento tardio (hoje: Three.js e Firebase).
- [ ] `npm test` passa (regressão, emergência ponta a ponta e axe nos dois temas).
- [ ] Scripts com `defer`; terceiros carregados de forma tardia.
- [ ] CSS e JS minificados, sem código não utilizado.
- [ ] Nenhum elemento causando layout shift (espaço reservado para mídia e embeds).
- [ ] PageSpeed Insights ≥ 90 em mobile e desktop.
- [ ] Nenhum `<style>` ou `style=""` no HTML.
- [ ] Arquivos na arquitetura `assets/` + `pages/<page-name>/`.
- [ ] Cores só via `colors.css` e espaçamentos só via `spacing.css`.
- [ ] axe-core sem violações; WCAG 2.2 AA e heurísticas de Nielsen revisadas.
