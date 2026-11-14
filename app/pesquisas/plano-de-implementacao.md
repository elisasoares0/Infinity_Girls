# Plano: app atendendo 100% das expectativas, com assistente de voz e alerta à tripulação (custo zero)

## Contexto
A análise de lacunas (`pesquisas/analise-de-cobertura.md` e `pesquisas/lacunas-do-app.pdf`) fechou em 43 de 95 itens resolvidos e 23 lacunas.

A usuária quer:
- fechar todas as lacunas sem perder nenhuma funcionalidade atual;
- poder usar bibliotecas (antes era só HTML, CSS e JS);
- um assistente de IA que, quando um alerta dispara, fala na hora com a pessoa: diz os sinais vitais e exatamente o que fazer;
- que o assistente avise os colegas que aquela pessoa está em apuros e onde ela está.

Decisões da usuária:
- **Tudo 100% gratuito.**
- **Tempo real entre aparelhos**, se for gratuito.
- **Manter a base atual e adicionar bibliotecas.**
- **Entregar por fases, por impacto na avaliação.**

### Análise de custo (o que entra e o que não entra)

| Necessidade | Escolha | Custo | Observação |
|---|---|---|---|
| Hospedagem | Firebase Hosting, plano Spark | Grátis | Já usado hoje |
| Alerta em tempo real entre aparelhos | Firestore, plano Spark, com cache offline | Grátis | Cota diária de 50 mil leituras e 20 mil escritas, muito acima do uso da demo |
| Identidade no Firestore | Firebase Anonymous Auth | Grátis | Liga o aparelho à conta demo |
| Voz que fala | `speechSynthesis` (Web Speech API, nativa) | Grátis | Usa as vozes do sistema; funciona offline |
| Comandos de voz ("next", "repeat") | `SpeechRecognition` com conexão; botões grandes sempre | Grátis | No Chrome o reconhecimento usa servidor; offline ficam os botões |
| IA que responde perguntas | WebLLM (Apache-2.0) com modelo pequeno, roda no aparelho via WebGPU | Grátis | Opcional, baixado só com consentimento (centenas de MB, uma vez); sem WebGPU, a busca nos guias continua funcionando |
| Glicosímetro | Web Bluetooth, perfil padrão de glicose (GATT 0x1808), com entrada guiada como alternativa | Grátis | Web Bluetooth só existe em navegadores Chromium |
| Ultrassom | Câmera (`getUserMedia` / `capture`) e IndexedDB via `idb-keyval` (Apache-2.0) | Grátis | |
| Conquistas | `canvas-confetti` (ISC), desligado com `prefers-reduced-motion` | Grátis | |
| Dados da NASA | DONKI (já usado) e uma cópia do **OSDR** gerada no build | Grátis | O OSDR bloqueia chamadas do navegador (CORS), por isso a cópia |
| Testes | Playwright e axe-core | Grátis | Hoje esses testes só existem no scratchpad |

### Regra de segurança da IA (vale para todo o plano)
- A fala de emergência é **determinística**: o texto sai dos guias e das regras do app, com os valores reais medidos.
- O modelo de linguagem **nunca decide conduta** numa emergência. Ele só responde perguntas, com base nos guias e na página Learn, e sempre com o aviso "not a medical device".
- O assistente é o mesmo offline, em Marte e sem ligação com a Terra.

---

## Fase 0: Fundação (antes de tudo)

1. **Bibliotecas**
   - `package.json` com dependências em versão fixa.
   - Script `tools/vendor.js` que copia de `node_modules` para `assets/vendor/<lib>/`, com o arquivo de licença ao lado (mesmo padrão do Three.js).
   - Nada vem de CDN em produção, e tudo entra no `SHELL` do `sw.js`.
2. **Testes**
   - Os scripts do scratchpad (`tester/*.js`) passam para `tests/` com Playwright e axe.
   - Cobrem o que o app já faz, para nada se perder:
     - login com fase de voo;
     - astronauta 3D sem os controles nas mãos;
     - Vitals (Today, Weekly e Overall numerada);
     - painel do médico com o painel de exames;
     - Presentation mode;
     - Privacy;
     - guias de emergência offline;
     - temas claro e escuro.
   - Comandos `npm test` e `npm run test:a11y`.
3. **`tools/build.js`** continua igual e passa a copiar `assets/vendor`. O `firebase.json` ganha as regras do Firestore (`firestore.rules`).
4. **`CLAUDE.md`**
   - A seção 5.6 deixa de exigir "só JS puro". Biblioteca passa a valer quando:
     - é gratuita, com licença compatível e versão fixa;
     - fica local;
     - carrega tarde (depois do `load` ou sob demanda);
     - não derruba a meta de PageSpeed (≥ 90).
   - Entra a regra de segurança da IA.

## Fase 1: Emergência, voz e tripulação (cena do vídeo, P1)

### 1.1 Detecção de emergência: `assets/js/emergency-engine.js` (`App.emergency`)
- **Disparos automáticos**, lidos de `health:sample` e `App.crew`:
  - status "Act now";
  - respiração em 0 ou sem respiração, a partir da camisa;
  - SpO₂ abaixo de 85%;
  - frequência cardíaca acima de 150 ou abaixo de 40;
  - temperatura de 39 °C ou mais.
- **Disparos manuais:**
  - botão **SOS** no header (48×48, em todas as páginas, em voo e em solo);
  - comando de voz "help", quando o reconhecimento está disponível.
- **Presentation mode** ganha o campo "Simulate emergency" (dor no peito com colapso, SpO₂ baixa, febre) para a demo.

### 1.2 Assistente de voz: `assets/js/voice.js` (`App.voice`)
- Fila de fala com prioridade (a emergência interrompe o resto), voz em inglês, velocidade ajustável e "Repeat".
- Toda fala também aparece como **legenda** (`aria-live`), para ambiente barulhento e para quem não ouve.
- **Roteiro imediato**, montado com os valores reais. Exemplo: *"Commander Silva, your heart rate is 142 and your oxygen is 86 percent. Stop and strap in. I am alerting the crew. Dr. Okafor is the closest."*
- Em seguida, o guia passo a passo, com botões grandes Next / Repeat / I need help e os comandos de voz equivalentes.
- **Desbloqueio de áudio:** os navegadores exigem um gesto antes de falar. O app ativa a voz no gesto de login e mostra o estado "Voice assistant on/off" no Profile.

### 1.3 Guia "Not responding or not breathing": `pages/emergency/emergency.js`
- **Passos:**
  1. ver se responde e respira;
  2. chamar a tripulação (dispara 1.4);
  3. prender a pessoa e iniciar a reanimação adaptada à microgravidade, conforme o checklist médico de bordo;
  4. ligar o desfibrilador do kit e seguir a voz dele.
- **Apoios na tela:** metrônomo de 110 por minuto (Web Audio), cronômetro dos ciclos e registro de cada passo com horário UTC.
- "Chest pain or pressure" ganha o botão "The person collapsed", que abre este guia.
- O texto é sugestão de guia, a validar com médico de voo, como os guias atuais.

### 1.4 Alerta à tripulação em tempo real: `assets/js/crew-link.js` (`App.crewLink`)
- **Dados no Firestore:** documento `missions/{missionId}/alerts/{id}` com:
  - quem, o tipo do alerta;
  - os sinais vitais daquele alerta;
  - a localização;
  - a hora UTC e o status (`open`, `responding`, `resolved`);
  - quem respondeu.
- **Acesso:** Anonymous Auth e regras do Firestore que validam o formato e restringem à missão.
- **Nos outros aparelhos:**
  - banner vermelho em todas as páginas (gerado pelo `tools/chrome.js`);
  - voz *"Commander Silva needs help in Node 2. Chest pain, heart rate 142. Bring the medical kit."*;
  - mapa com a posição;
  - botão "I'm on my way".
- **De volta no aparelho de quem pediu ajuda:** a voz anuncia "Dr. Okafor is on the way".
- **Painel do médico:** o alerta ativo aparece no topo do painel da tripulação.
- **Sem conexão:** as escritas ficam na fila do cache offline do Firestore, e o `BroadcastChannel` cobre o mesmo aparelho. Em Marte isso representa a rede local da nave; a Terra recebe no próximo contato.
- **Privacidade:** a página Privacy ganha a regra fixa *"In an emergency, your location and the vital signs of that alert are shared with the crew."* Nenhum outro dado sai.

### 1.5 Localização e mapa: `assets/js/habitat.js` (`App.habitat`)
- Mapa em SVG por ambiente: módulos da estação, veículo de transporte e base lunar com a área de caminhada espacial.
- **Posição atual:**
  - simulada pela rotina (alojamento à noite, academia no horário do exercício);
  - pode ser corrigida pela pessoa no seletor "I'm in…".
- **Na Lua, em caminhada espacial:** distância e direção a partir da base (simulado).
- O mapa aparece no alerta, no painel do médico e no Profile.

### 1.6 "How it is measured / Why it matters / What to do"
- Os três campos para os 8 indicadores e para as medições do kit (ECG, pupilas, fita de urina e, na fase 2, glicose).
- Ficam em `assets/js/today-ring.js`, junto do `ADVICE` atual, que não muda.
- Aparecem no card flutuante da home, no detalhe da Vitals e nos guias.
- Botão "Explain out loud" lê os três campos em voz.

## Fase 2: Resto do P1, lembretes e IA de perguntas

Feito em 13/11/2026: **Ambientes de superfície** e **Página Learn** (marcados abaixo). Próximos: glicose, lembretes, gamificação, ultrassom e IA de perguntas.

- **Glicose:**
  - card "Blood glucose (mg/dL)" com faixa, cor, tendência, "por que importa" e "o que fazer";
  - leitura pelo glicosímetro via Web Bluetooth, com entrada guiada passo a passo como alternativa;
  - resultados de exame de sangue no mesmo lugar;
  - entra em `App.crew` (`METRICS`) e aparece no médico.
- **Ultrassom:**
  - exame guiado da veia do pescoço: guia sobre a câmera, captura, imagem salva por data no IndexedDB;
  - o médico vê e dá o status, sem diagnóstico automático;
  - tela nova em `pages/body/`.
- **Gamificação:**
  - metas semanais (água, exercício, sono, check-in);
  - conquistas por sequência e anel de progresso na home;
  - confete só sem `reduced-motion`;
  - sem ranking entre tripulantes;
  - novo módulo `assets/js/goals.js`.
- **Lembretes:**
  - banner na hora de cada tarefa ou exame;
  - linha "Next: …" na home;
  - notificação do sistema só com permissão;
  - lembrete falado pelo `App.voice`.
- **Ambientes de superfície** (feito):
  - contextos "base" e "rover" dentro de Lua e Marte (`MODES`, Presentation mode);
  - mudam tarefas, alertas (poeira, carga da caminhada espacial) e o mapa.
- **Página Learn** (`pages/learn/`, feito):
  - os 5 perigos e os riscos do HRP ligados aos indicadores e às instruções do kit;
  - link a partir de cada card e de cada guia.
- **IA de perguntas no aparelho:**
  - botão "Ask the assistant";
  - WebLLM baixado só com consentimento, respostas com base nos guias e na Learn, com aviso;
  - sem WebGPU, busca nos guias.

## Fase 3: Dados da NASA e riscos do HRP (P2)

- **OSDR:**
  - `tools/fetch-osdr.js` gera uma cópia de dados humanos de voo em `assets/data/osdr-*.json`, com crédito;
  - o conjunto ainda precisa ser escolhido. Candidatos citados pela NASA: os dados de sangue da Inspiration4, OSD-569, 570, 571 e 575;
  - usado para conferir faixas, testar a glicose e mostrar "NASA data" na tela.
- **SANS:** teste rápido de visão de perto, relato de sintomas e registro de complexo B e de manguito de coxa.
- **Nutrição:** calorias, proteína, vitamina D e cálcio.
- **Enjoo e equilíbrio:** escala de enjoo e teste de equilíbrio depois de cada troca de gravidade.
- **Humor e estresse:** check-in com escala, tendência e recursos de apoio.
- **Imune:** tendência dos resultados das coletas.
- **Faixas por gravidade:** referência por destino.
- **Radiação:** a parte de nêutrons separada na dose.

## Fase 4: Completar a cobertura (P3)

- Descompressão e caminhada espacial na prontidão ("Ready for EVA" exige a pré-respiração).
- Ar da cabine: CO₂, O₂ e temperatura.
- Pergunta de trabalho em equipe.
- Questionário depois do pouso.
- Página Connection, que substitui o "Coming soon".
- Modo "Ground" do médico de voo, com o atraso de cada dado.
- Luz e ritmo circadiano.
- Linha "Built for Mars, useful on Earth" e o slide correspondente na apresentação.

## Ao final de cada fase
- `npm test`: todas as funcionalidades atuais continuam funcionando, com axe sem violações nos dois temas.
- PageSpeed ≥ 90 no celular.
- `sw.js`: `SHELL` atualizado e `CACHE_VERSION` incrementada.
- Rodar `node tools/chrome.js` quando a navegação mudar.
- `CLAUDE.md` atualizado.
- A análise de cobertura é recalculada, com o placar e o PDF.

## Arquivos principais
- **Novos:**
  - `package.json`, `tools/vendor.js`, `tools/fetch-osdr.js`, `tests/`;
  - `firestore.rules`;
  - `assets/js/emergency-engine.js`, `voice.js`, `crew-link.js`, `habitat.js`, `goals.js`;
  - `pages/learn/`.
- **Alterados:**
  - `assets/js/app.js`, `crew-data.js`, `today-ring.js`;
  - `pages/emergency/emergency.js`, `pages/home/*.js`, `pages/body/`, `pages/privacy/`;
  - `tools/chrome.js`, `tools/build.js`, `sw.js`, `firebase.json`, `CLAUDE.md`.

## Verificação da fase 1, ponta a ponta
1. **Dois navegadores** (astronauta `hsilva` e médico `cokafor`, mesma missão):
   - Presentation mode → "Simulate emergency: chest pain, collapse";
   - no aparelho da astronauta, a voz fala os valores e começa o guia, e a legenda aparece;
   - em até 2 s, o aparelho do médico mostra o banner com voz e o mapa ("Node 2");
   - "I'm on my way" faz o aparelho da astronauta anunciar a resposta.
2. **Modo avião no aparelho da astronauta:**
   - voz e guia continuam funcionando;
   - o alerta sai quando a conexão volta.
3. **Guia "Not responding or not breathing":**
   - metrônomo a 110 por minuto;
   - cronômetro;
   - registro UTC de cada passo;
   - acessível por teclado e por leitor de tela.
4. Os testes de regressão de tudo o que já existia passam.
