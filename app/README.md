# Astro Health: monitoramento de saúde de astronautas

Protótipo do time **Infinity Girls** para o **NASA Space Apps Challenge 2026**.

Aplicativo web (PWA) que acompanha a saúde de astronautas **antes, durante e depois** de missões na estação espacial, na Lua e em Marte. Os dados vêm sozinhos dos sensores, e o app transforma isso em decisões simples para a própria pessoa e para o médico de bordo. Ele funciona **sem internet**, sem nenhum serviço pago, e segue a **WCAG 2.2 AA**.

> **Aviso:** protótipo com dados de saúde **simulados**. Não é um dispositivo médico. As orientações são exemplos simplificados e não substituem o médico de voo.

- **No ar:** https://spaceapps2026-infinitygirls.web.app
- **Interface:** em inglês, como a documentação da NASA. Os horários são todos em **UTC**, como a bordo.

---

## Sumário
1. [Como acessar e testar](#1-como-acessar-e-testar)
2. [Entrar, criar conta e fase da missão](#2-entrar-criar-conta-e-fase-da-missão)
3. [O que aparece em todas as telas](#3-o-que-aparece-em-todas-as-telas)
4. [Home do astronauta](#4-home-do-astronauta)
5. [Astronauta 3D, check-in de sintomas e modo náusea](#5-astronauta-3d-check-in-de-sintomas-e-modo-náusea)
6. [Sinais vitais e gráficos em tempo real (Vitals)](#6-sinais-vitais-e-gráficos-em-tempo-real-vitals)
7. [Corpo (Body)](#7-corpo-body)
8. [Diferenciais para mulheres e homens](#8-diferenciais-para-mulheres-e-homens)
9. [Perfil do médico (oficial médico de bordo)](#9-perfil-do-médico-oficial-médico-de-bordo)
10. [Emergência guiada por voz](#10-emergência-guiada-por-voz)
11. [Assistente "Ask": pergunta escolhida, escrita ou falada](#11-assistente-ask-pergunta-escolhida-escrita-ou-falada)
12. [Mensagens de saúde: lembretes, remédios e exames](#12-mensagens-de-saúde-lembretes-remédios-e-exames)
13. [Metas do dia e conquistas](#13-metas-do-dia-e-conquistas)
14. [Privacidade](#14-privacidade)
15. [Riscos de saúde (Learn)](#15-riscos-de-saúde-learn)
16. [Perfil (Profile)](#16-perfil-profile)
17. [Destinos, fases e contextos de superfície](#17-destinos-fases-e-contextos-de-superfície)
18. [Modo de apresentação (Demo)](#18-modo-de-apresentação-demo)
19. [Acessibilidade e usabilidade](#19-acessibilidade-e-usabilidade)
20. [Offline, dados e integração com o backend](#20-offline-dados-e-integração-com-o-backend)
21. [Tecnologia, estrutura, testes e deploy](#21-tecnologia-estrutura-testes-e-deploy)

---

## 1. Como acessar e testar

**Contas de demonstração.** Todas usam a senha `Mission2026`. Elas aparecem no bloco "Demo accounts" da tela de entrada, com um botão que preenche o login.

| NASA ID | Pessoa | Perfil |
|---|---|---|
| `hsilva` | Cmdr. Helena Silva, comandante | Astronauta mulher (com o módulo de saúde feminina) |
| `ktanaka` | Eng. Kenji Tanaka, engenheiro de voo | Astronauta homem (com o foco em saúde masculina) |
| `cokafor` | Dr. Chidi Okafor, oficial médico de bordo | Médico (painel da tripulação) |

A tripulação simulada tem uma quarta pessoa, a Spc. Novak, que só aparece para o médico.

**Rodar no computador.** É preciso ter o Node 18 ou mais recente.
```bash
npm install
npm run serve        # http://localhost:8080 (também abre no celular na mesma rede)
```

---

## 2. Entrar, criar conta e fase da missão

- **Onde:** a própria home (`index.html`), com as abas **Sign in** e **Create account**. Não há redirecionamento. Uma página interna aberta sem sessão volta para a home.
- **Sign in:**
  - Digite o NASA ID e a senha. O botão **Show** mostra a senha.
  - Escolha a **fase do voo** no grupo "Flight phase": **Before flight**, **In flight** ou **After flight**. Cada opção é uma missão real do arquivo `missions.json`:
    - em voo: One-Year Mission (365 dias na estação);
    - antes do voo: Artemis V (Lua, 2027);
    - depois do voo: Expedition 72.
  - O app abre nessa fase. A escolha fica marcada para a próxima vez.
- **Create account:**
  - Pede NASA ID, nome completo, ID de astronauta (`AST-1234`) ou registro de médico (`CRM-SP 123456`), sexo, data de nascimento e senha (8 caracteres ou mais, com letras e números).
  - **O ID define o papel:** um ID `AST-…` cria um astronauta, e o sexo escolhe o perfil feminino ou masculino. Um registro `CRM…` cria um médico.
  - A conta nova usa os dados simulados do tripulante modelo do mesmo perfil, com o nome e o ID dela.
- **Segurança:** a senha é guardada como hash SHA-256 com sal, só no aparelho. A tela avisa que isso é um protótipo, não segurança real.
- **Sair:** **Sign out**, no Profile, apaga só a sessão. As contas e os dados continuam no aparelho.

---

## 3. O que aparece em todas as telas

- **Header:**
  - **Linha de status:** fase e dia da missão (com o lugar, como "Moon base" ou "rover traverse"). Em voo também mostra a última sincronização, o atraso do sinal com a Terra (de "< 1 s" a "até 22 min" em Marte) e quem lidera as decisões médicas (médico de voo em terra ou oficial médico de bordo).
  - **Tema:** o botão mostra a ação seguinte (lua e "Dark" no tema claro, sol e "Light" no escuro). Sem uma escolha salva, segue o tema do aparelho.
  - **Ask:** abre o assistente (seção 11).
  - **SOS** (vermelho, só em voo): pede ajuda na hora (seção 10).
  - **Faixa de alerta da tripulação:** quando outra pessoa pediu ajuda.

- **Tab bar:**
  - astronauta: **Home, Vitals, Tasks, Privacy, Profile**;
  - médico: **Home, Emergency, Profile**.
  - No celular ela fica fixa embaixo; no desktop, é uma barra flutuante.

- **Rodapé:** os créditos (dados simulados, limite de radiação da NASA, clima espacial do NASA DONKI e fontes) e o botão **Demo** do modo de apresentação (seção 18).

- **Chat "Health messages":** botão redondo no canto inferior direito, que recebe todas as notificações (seção 12).

- **Faixa "No connection with Earth"** (em voo): aparece em todas as páginas quando o aparelho fica offline. Avisa que tudo continua funcionando a bordo e leva aos procedimentos de emergência.

- **Legenda da voz:** tudo o que o app fala aparece também escrito acima da tab bar.

---

## 4. Home do astronauta

A home muda conforme a fase e o perfil. As seções são estas, de cima para baixo.

1. **Saudação:** "Hello, Cmdr. Silva", o dia da missão e uma frase com o que pede atenção hoje ("One reading needs attention today: your body temperature"). Em Marte aparece o aviso "Earth is up to 22 minutes away", com quem decide a bordo e o atalho para os procedimentos de emergência.

2. **Your body now:** o astronauta 3D com os sinais ao vivo (seção 5).
   - **Fontes ao vivo:** a linha "Live from your shirt, water dispenser and exercise devices" mostra a hora da última leitura.
   - **Prontidão:** a nota de 0 a 100, com um selo como "Ready for EVA" ou "Light duty today".
   - **Aviso "Readiness dropped…":** diz o que pede atenção e tem o botão "See what to do".
   - **Cards compactos:** 8 indicadores (frequência cardíaca, pressão, SpO₂, respiração, temperatura, sono, hidratação e exercício), cada um com ícone, valor e selo.
   - **Botão "Log nausea or vomiting".**

3. **Cards de saúde:**
   - **Body mass:** massa medida pelo SLAMMD, diferença desde o lançamento e tendência, com o link "See body trends".
   - **Blood glucose:** a última leitura do glicosímetro e o botão **Measure now** (abaixo).
   - **Radiation dose** (só em voo): dose recebida, limite de carreira de 600 mSv, dose de hoje e projeção para o fim da missão, numa barra que mostra o recebido e o projetado. Os botões de ajuda explicam "What is mSv?" e "What does this mean for fertility?".
   - **Space weather** (só em voo): dados **ao vivo da NASA DONKI**, com eventos de partículas solares (SEP) e análises de ejeção de massa coronal (CME) da semana.

4. **Health tasks today:** a lista de tarefas do dia. Toque numa tarefa para marcar como feita; dá para desfazer.
   - **Contador:** "1 of 5 done", e a linha "Next: …" com a próxima tarefa e a hora.
   - **Em voo:** glicose antes do café, coleta de saliva, sessão de exercício (os aparelhos contam os minutos sozinhos), exame de retina (OCT), conferência médica privada, check-in de humor e ultrassom do pescoço (semanal).
   - **Base na Lua ou em Marte:** "Clean suit seals and rinse eyes and nose".
   - **Rover:** "Check the rover medical kit" e "Drink 250 ml every hour on the drive".
   - **Antes do voo:** briefing de quarentena e "Pack medicines and supplies", mais a lista **"Your pre-flight exams"**, só para leitura (quem marca é o médico de voo).
   - **Depois do voo:** teste de ficar em pé, caminhada assistida, densitometria pós-voo, olhos e audição, e acompanhamento de saúde vitalício.

5. **Daily goals:** as metas e conquistas (seção 13).

6. **Your health, your rules:** atalhos para os módulos opcionais: Women's health ou Men's health focus, Privacy e Body. O módulo "Connection" está marcado como "Coming soon".

**Medir a glicose (Measure now):**
- O diálogo explica os passos: lavar as mãos, furar a lateral do dedo e pôr a gota na fita.
- **Por Bluetooth:** o botão liga o glicosímetro pelo Web Bluetooth (padrão GATT de glicose) e lê a medida sozinho.
- **Sem Bluetooth:** digite o número em **mg/dL ou mmol/L** (o app converte; aceita de 20 a 600 mg/dL).
- **Faixas:**
  - 70 a 140 mg/dL: "In range";
  - 54 a 69 ou 141 a 250: "Watch";
  - abaixo de 54 ou acima de 250: "Act now".
- **Abaixo de 54 em voo**, a emergência de glicose baixa começa sozinha.
- Fora da faixa, o card mostra "Back to normal when…" e os passos (por exemplo, 15 g de açúcar rápido e medir de novo em 15 minutos).
- A glicose é o **único valor digitado pelo astronauta**, porque nenhum sensor da camisa a mede.

**Temperatura em "Watch":**
- O card mostra "Back to normal when: a new reading is between 36.1 and 37.5 °C" e dois passos para marcar: "I drank 250 ml of water" e "I rested for 30 minutes".
- Com os dois marcados, **a camisa faz a nova leitura sozinha** (20 segundos na demonstração, cerca de 30 minutos a bordo).
- Marcar os passos não apaga o alerta. Só uma leitura dentro da faixa faz isso.

---

## 5. Astronauta 3D, check-in de sintomas e modo náusea

### O boneco 3D
- **Modelo:** é o traje real **EMU** da NASA 3D Resources, sem a mochila, porque dentro da nave ninguém a usa.
- **Pontos de sensor:** 8 pontos na superfície do traje, um por indicador, com a cor do status: azul para OK, amarelo para Watch, vermelho com halo pulsando para Act now e cinza sem sinal.
- **Girar:** arraste o boneco, use os botões **Turn left/right** ou as setas do teclado sobre esses botões.
- **Ponto ou card compacto:** abre o **card flutuante** do indicador, com o valor, a linha das últimas 24 horas, a fonte e a hora, a faixa normal e "What to do".
  - Dentro de "How it is measured" e "Why it matters": **"Explain out loud"** (lê em voz alta) e **"Learn about this risk"**.
  - Em telas largas, o card encaixa ao lado do ponto e o boneco desliza para a esquerda. No celular, ele vira uma folha na base.
- **Flutuação:** o boneco flutua como em microgravidade. Com "reduzir movimento" no aparelho ou no modo náusea, ele fica parado.
- **Sem WebGL:** a mensagem diz o motivo ("WebGL is off in this browser…"). Se o carregamento falhar, aparece **"Try again"**, e os cards continuam funcionando.

### Check-in de sintomas no corpo
- **Mouse sobre o corpo:** **a região acende** em azul e aparece o rótulo, por exemplo "Abdomen & metabolism · click to log a symptom".
- **Clique ou toque no corpo**, fora de um ponto de sensor: abre o **card de check-in** daquela região. Os pontos continuam abrindo os sinais vitais.
- **Pelo teclado:** 6 atalhos ficam escondidos até receberem foco com Tab ("Log a symptom: Head", "Chest"…), para quem usa teclado, leitor de tela ou aparelho sem 3D.
- **Regiões e sintomas:**

| Região | Sintomas |
|---|---|
| Head | Headache, Blurry vision, Dizziness, Nausea or motion sickness |
| Chest | Chest pain, Short of breath, Racing or skipping heartbeat |
| Abdomen & metabolism | Nausea, Vomiting, Abdominal discomfort, Weak or shaky |
| Back | Back pain, Stiffness |
| Arms & hands | Hand or finger pain, Numbness or tingling, Joint pain |
| Legs & feet | Calf pain or swelling, Muscle cramp, Joint or bone pain |

- **Como usar o card:**
  1. Escolha o sintoma.
  2. Ajuste a intensidade de **1 a 5**: Very mild, Mild, Moderate, Strong ou Severe.
  3. Leia a **conduta**, que muda conforme o nível:
     - 1 e 2: autocuidado e uma dica;
     - 3: contar ao médico na próxima consulta;
     - 4 e 5: contar agora.
  4. Toque em **Save check-in**.
- **Atalhos que aparecem conforme o caso:**
  - **Start SOS**, para dor no peito ou falta de ar de nível 3 ou mais, em voo;
  - **Measure blood sugar**, para fraqueza;
  - **Why this happens in space**, que leva à Learn.
- **Na Terra,** um sinal de alerta pede para ligar ao médico de voo.
- **Depois de salvar,** o sintoma aparece em **"Your symptoms today"**, com a região, a hora e o nível, e o botão **"Feeling better"**.
- **Para o médico:** um sintoma forte (nível 4 ou 5) ou um sinal de alerta (nível 3 ou mais: peito, falta de ar, panturrilha, dormência ou articulação depois de caminhada espacial) vira **alerta no painel do médico**.

### Modo náusea (acessibilidade espacial)
- **O botão "Log nausea or vomiting"**, ao lado do título, registra só náusea ou vômito.
- **Liga sozinho** ao registrar náusea ou vômito. Também pode ser ligado no Profile, em "Nausea mode".
- **O que muda na tela:** tudo o que não é essencial fica com letra menor (nunca abaixo de 12 px). Estrelas, ondas e linhas decorativas somem, e **nada se mexe**: sem animações, e o boneco 3D para de flutuar.
- **O que continua um pouco maior:** a barra do topo, o SOS, o chat de mensagens e o card de sintomas.
- **A barra compacta do topo** mostra o último registro e o essencial: "Head still, eyes on one fixed point, small sips of water". Os 4 passos ficam em **"What helps now"**, com os botões **"Read aloud"** e **"I feel better"** (que desliga o modo).
- **Depois de cada registro,** a página sobe até a barra e põe o foco nela.
- **Desliga sozinho** 24 horas depois do último registro. Já abre simplificado em qualquer página, sem piscar.

---

## 6. Sinais vitais e gráficos em tempo real (Vitals)

**Dados contínuos, 24 horas por dia, sem digitar nada:**
- **Camisa Astroskin:** frequência cardíaca, pressão arterial, SpO₂, respiração, temperatura e sono.
- **Dispensador de água:** hidratação.
- **Aparelhos de exercício** (ARED, esteira T2 e bicicleta CEVIS): os minutos de exercício.

**Atualização ao vivo:**
- O app recebe uma amostra nova **a cada 5 segundos** e atualiza números, gráficos e cores no lugar, sem perder o foco.
- O leitor de tela é avisado só quando um status muda (por exemplo, "Heart rate back in range").
- Com a aba escondida, a atualização pausa.

**Abas da página Vitals:**
- **Today:**
  - um anel de **8 cápsulas** com ícone em volta da nota de prontidão;
  - ao tocar numa cápsula, o detalhe mostra a **linha das últimas 24 horas** e os **7 dias**, a faixa normal, o que fazer e "Explain out loud";
  - um resumo em colunas.
- **Weekly:**
  - **"Readiness, last 7 days"**, com uma coluna por dia;
  - cada coluna é um botão que mostra as leituras daquele dia.
- **Overall:**
  - **"Every day of the mission"**, uma grade com um quadrado por dia (por semana em missões de mais de 365 dias), numerado e colorido pelo status;
  - Watch e Act now têm uma marca no canto, e o dia do pouso tem borda grossa;
  - chips filtram por indicador.
- **Blood glucose and lab results:**
  - gráfico da glicose dos **últimos 14 dias**, com a faixa normal;
  - botão **Measure now**;
  - **resultados de laboratório** das coletas semanais de sangue e saliva feitas pelo analisador de bordo.

**Em todo gráfico:**
- Passe o mouse ou toque num ponto para ver o valor.
- **"Show data as a table"** mostra a mesma informação em tabela.
- Há sempre um resumo em texto.
- O status aparece com **ícone, texto e textura**, nunca só com cor.

**Sensor sem sinal** (por exemplo, a camisa tirada): o card mostra "No signal", o último valor e o pedido para recolocar a camisa. Nada que a camisa mede é digitado à mão.

---

## 7. Corpo (Body)

Mostra como massa, ossos, músculos e olhos se adaptam desde o lançamento.

- **Antes do voo:**
  - **Baseline scans**, os exames de referência e o status de cada um: densitometria (DXA), estrutura do quadril (QCT), retina (OCT) e teste de massa e condicionamento;
  - **"Your training plan"**, com o plano de exercício, o acompanhamento do médico nos treinos de risco e a quarentena de 14 dias.
- **Mass and bone:**
  - **Massa corporal** medida pelo SLAMMD (a balança não funciona sem gravidade), com a faixa esperada;
  - **densidade óssea**, com a perda projetada no pouso.
- **Muscle and exercise:**
  - os minutos dos **últimos 7 dias** contra a meta de 120 minutos;
  - o **plano de hoje** por aparelho: ARED, esteira e bicicleta.
- **Vision:**
  - **exames de retina (OCT)**, com a espessura em micrômetros contra o nível de alerta;
  - o horário do próximo exame;
  - a explicação da SANS (síndrome neuro-ocular).
- **Neck vein ultrasound** (em voo, uma vez por semana):
  1. **"Start guided exam"** explica cada passo: prender-se, virar a cabeça, gel, sonda acima da clavícula e segurar parado por 5 segundos.
  2. Envie a imagem de uma de três formas: **arquivo do aparelho de ultrassom**, **câmera** (com uma moldura para enquadrar a tela do aparelho) ou **imagem de exemplo** (para a demonstração).
  3. Escreva uma observação opcional e envie.
  - O status fica **"Waiting for the medical team"** até o médico dar a leitura.
  - O app **nunca dá diagnóstico**.
  - "Your scans" guarda o histórico.
  - Uma leitura "Watch" ou "Act now" chega como mensagem no chat.
- **Depois do voo:** o plano de reabilitação de cerca de 45 dias, em três fases: Gentle start, Low impact e Full strength.

---

## 8. Diferenciais para mulheres e homens

Cada astronauta vê **só o módulo do seu perfil**, ligado por padrão. Os dois são **opcionais**: a pessoa pode desligá-los, e só ela vê o conteúdo, a menos que libere em Privacy.

### Saúde da mulher (Women's health), Cmdr. Silva
- **Cycle plan for this mission:** o plano decidido com o médico antes do lançamento.
  - **Continuous pill:** a mais usada em missões longas (cerca de 1 100 pílulas numa missão de 3 anos a Marte).
  - **IUD or implant.**
  - **Adjust to mission dates.**
  - **Menstruate normally.**
  - Cada opção muda o que é preciso levar a bordo.
- **Pre-flight pregnancy test:** status e data dos testes nos 10 dias antes do lançamento. Mostra **só o status e a data, nunca o resultado**.
- **Cycle calendar:**
  - toque num dia para registrar sangramento, e toque de novo para desfazer;
  - mostra o período esperado, hoje e os eventos da missão (lançamento, pouso, caminhada espacial);
  - mostra a média do ciclo e do período e a próxima data, e tem "Show coming dates as a list".
- **Today's pill:** "Mark as taken". Também chega como lembrete às **21:00 UTC** no chat, com o botão "Taken".
- **Pill supply on board:** pílulas a bordo contra as necessárias até o fim da missão.
- **Contraception, blood clots and bones:** explica que a pílula dobra o risco de trombose, mas que astronautas que a usam não têm risco maior, e por que a injeção trimestral é evitada (perda óssea).
- **Urinary symptoms:** marque ardor, urgência, frequência, dor no baixo-ventre ou urina turva ou com sangue, e toque em "Log symptoms". Se a pessoa compartilha esses dados, eles viram alerta para o médico, porque infecção urinária é uma causa comum de retorno antecipado.
- **Return to gravity:** a preparação para o pouso (mulheres desmaiam mais ao ficar em pé depois do voo): 1 L de água com sal, roupa de compressão, levantar devagar e o plano de reabilitação de 45 dias.
- **Help close the data gap:** só cerca de 75 mulheres foram ao espaço e 1 em cada 10 estudos usou dados reais de voo. Há a opção de compartilhar dados anônimos com pesquisadores, com a lista do que eles recebem e do que nunca recebem.

### Foco em saúde masculina (Men's health focus), Eng. Tanaka
- **Vision, extra attention:** a SANS aparece cerca de **3 vezes mais em homens**.
  - O gráfico da retina usa um **nível de alerta mais baixo**: +15 µm em vez de +20 µm.
  - O check-in diário marca "Blurry near vision", "Headache when waking up" ou "Shadow or spot in vision", com "Log changes" ou "No changes today".
- **Hearing:**
  - **Noise today:** a média de ruído do dia, do dosímetro acústico, em dBA, contra o limite de 24 horas usado no protótipo (65 dBA), com a orientação de usar protetor auricular.
  - **Hearing test:** quando vence o próximo teste de audição de bordo (a cada 30 dias), com o botão **"Log hearing test done"**. O app **registra** que o teste foi feito; ele **não mede a audição** sozinho, porque o teste é feito no equipamento de bordo.
- **Reproductive health and radiation:** a dose recebida e a projetada, e o que os estudos mostram sobre testosterona e espermatozoides. Nada é registrado aqui; a orientação é falar na conferência privada.
- **Help research:** compartilhamento anônimo opcional, com o que vai e o que nunca vai.

### Outras diferenças por perfil
- **Exames antes do voo:** o teste de gravidez só para mulheres.
- **Remédios no chat:** a pílula só para quem usa.
- **Radiação:** o card explica a fertilidade dos dois lados (óvulos não se renovam; células que produzem espermatozoides são sensíveis). O limite de 600 mSv é o mesmo para mulheres e homens.

---

## 9. Perfil do médico (oficial médico de bordo)

Ao entrar com `cokafor`, a home vira o **painel da tripulação**.

- **Quem lidera** (em voo):
  - "Ground flight surgeon leads" na estação e na Lua, onde o atraso é pequeno e o médico apoia a bordo;
  - "Crew medical officer leads" a caminho de Marte.
- **Fichas da tripulação:** uma por pessoa (Silva, Tanaka, Okafor e Novak), com:
  - nome, função, sexo, idade e fase;
  - status do dia e idade dos dados;
  - prontidão, sinais vitais, glicose, sintomas do dia, humor e sono.
  - Tudo **respeita a privacidade**: se a pessoa não compartilha, aparece "Not shared by crew member".
  - No rover, a ficha diz onde a pessoa está e quanto tempo leva até a base.
- **Busca e filtros:** "Search crew member" por nome ou função, e chips de status em voo, que filtram fichas e alertas juntos.
- **Alerts and decision guides** (em voo), dos mais urgentes para os menos. Cada alerta tem:
  - o porquê;
  - os **passos** para marcar;
  - "quando escalar";
  - o que registrar;
  - "como sai do alerta".
  - **Fontes dos alertas:** sinais vitais fora da faixa (por exemplo, a febre do Tanaka e as noites curtas da Novak), glicose, ultrassom esperando leitura há mais de 24 horas, sintomas fortes do check-in e saúde feminina (com consentimento).
  - **O único campo digitado pelo médico** é o resultado da **fita de urina**, porque nenhum sensor a mede.
  - Os guias funcionam offline.
- **Images to review:** ultrassons enviados pela tripulação. O médico vê a imagem e a observação, escolhe **Normal / Watch / Act now**, escreve o parecer e salva. O resultado volta para o astronauta.
- **Antes do voo:** cada ficha tem **"Pre-flight exams"**, com feitos, agendados e a agendar ("due soon" em amarelo quando a janela fecha em até 14 dias).
  - O painel lateral mostra os exames da pessoa em **To schedule**, **Scheduled** e **Done**.
  - **"Schedule"** abre um formulário com a data dentro da janela do exame e o horário (09:00, 10:30 ou 14:00 UTC).
  - Exames agendados podem mudar de data ("Change date") ou ser cancelados ("Cancel").
  - **Catálogo de exames:** certificação anual, audiometria, OCT, sangue, urina e saliva, QCT (missões de 180 dias ou mais), DXA, conferência privada e teste de gravidez.
- **Emergency** na tab bar: a página de procedimentos sempre à mão.
- **Mensagens:** cada alerta novo da tripulação chega no chat (seção 12).
- **Assistente:** "How is the crew today?", "Who needs attention?" e "How is Tanaka?" (seção 11).
- **Emergência de outra pessoa:** o diálogo abre em modo "responder", com a voz para a tripulação, o mapa, o guia e os botões **"I'm on my way"** e **"Resolved"**.

---

## 10. Emergência guiada por voz

A emergência foi pensada para dar **autonomia**: começa sozinha, fala os valores e o passo a passo, e pode ser conduzida **por comandos de voz**.

### Como começa
- **Sozinha:** quando um sinal da própria pessoa **passa para "Act now"** (frequência cardíaca, SpO₂, respiração, pressão ou temperatura), quando a respiração vai a zero ou quando a glicose fica abaixo de 54 mg/dL.
- **Pelo botão SOS** do header, em voo, em todos os perfis.
- **Pelo assistente** ("my crewmate is not breathing" mostra "Start SOS" primeiro) ou pelo check-in de sintomas (dor no peito ou falta de ar fortes).
- **Pela simulação** do modo Demo.

### O que acontece na hora
1. **A voz fala** os valores medidos e o que fazer, para a própria pessoa, para quem está perto e para a tripulação. O texto aparece também na legenda.
2. **O alerta vai para a tripulação** em tempo real (Firestore entre aparelhos, e entre abas no mesmo aparelho), com a **localização**: o módulo onde a pessoa está, pela rotina, e o **mapa do habitat**. Sem conexão, o alerta fica numa fila e sai quando a conexão volta.
3. **O guia aparece um passo por vez**, e **a voz lê cada passo**. Quando um passo usa um item do kit médico (ECG, oxímetro, desfibrilador, oxigênio, autoinjetor, torniquete), aparece também **como usar**.
4. Quem pediu ajuda **ouve quem está a caminho** ("Doctor Okafor is on the way").

### Comandos de voz (mãos livres)
- No diálogo SOS, toque em **"Voice commands"**. A linha embaixo confirma: "Listening. Say *next*, *repeat* or *help*".
- **"next"** avança o passo, **"repeat"** repete o que foi dito e **"help"** fala quem está vindo.
- **O app não ouve a própria voz:** enquanto fala, e logo depois, nada conta como comando. Só uma frase curta com o comando é aceita.
- **Se o microfone estiver bloqueado** ou não houver conexão, a linha diz o motivo e sugere os botões.
- **Limites do navegador:**
  - o reconhecimento de voz existe no Chrome e no Edge e precisa de conexão;
  - a fala (síntese) funciona offline;
  - o navegador só começa a falar depois de **um toque na página**. Até lá, o diálogo mostra "Tap to hear the instructions" e o celular vibra.
- **Configuração** no Profile, no cartão "Voice assistant": ligar ou desligar, velocidade, testar e "I'm in…" (corrige o local onde você está por 2 horas).

### Reanimação (metrônomo e cronômetro)
- No guia "Not responding or not breathing", **"Start the compression beat"** liga um **metrônomo de 110 compressões por minuto**, com uma batida visual, e um **cronômetro** do tempo de massagem.
- **A cada 2 minutos a voz avisa:** "Two minutes. Check breathing."

### Botões do diálogo
- **Next step**, **Repeat**, **Mark done** e **"Open the full guide"**.
- **"I'm OK, cancel the alert"** pede **dois toques**, para evitar cancelar sem querer. O primeiro toque já cala a voz.
- **Esc não fecha:** **Minimize** recolhe o diálogo e deixa a faixa no header.
- **Registro:** cada passo fica com o horário UTC, no mesmo registro da página de emergência, para ir à Terra.

### Página "Emergency procedures"
- Só em voo, e funciona offline.
- "What is happening?" lista todos os guias. Cada passo marcado fica registrado com o horário UTC.
- **Atalhos para a página:** o diálogo SOS, a faixa sem conexão, a Learn, o Ask, o botão da home e a aba do médico.

---

## 11. Assistente "Ask": pergunta escolhida, escrita ou falada

Abra com o botão **Ask** no header.

### Três formas de perguntar
1. **Escolher** uma das perguntas prontas (chips):
   - astronauta em voo: "How is my health today?", "Did I sleep well?", "Am I ready for EVA?", "What should I do now?", "Heart rate this week", "How is heart rate measured?";
   - na Terra e para o médico, há listas próprias.
2. **Escrever** no campo e tocar em **Ask**.
3. **Falar:** toque no **microfone** e fale a pergunta em inglês (Chrome e Edge, com conexão).

### Dois tipos de resposta, ambos locais e offline
1. **"From your data":** a resposta é calculada com os **números de agora**.
   - Traz um texto curto, a lista de cada valor com o selo (OK / Watch / Act now) e o botão **"Where to see it"**, que leva à tela certa.
   - **Exemplos do que responde:**
     - a saúde de hoje e cada indicador;
     - a **tendência da semana** (média, mínimo, máximo e dias fora da faixa);
     - o sono;
     - a **prontidão e o que a puxa para baixo**;
     - a glicose e os sintomas registrados;
     - as tarefas e o que vem a seguir;
     - os remédios tomados;
     - o resultado do ultrassom e a radiação;
     - "What should I do now?".
   - **Até 3 assuntos numa pergunta:** "did I sleep well and is my heart rate ok?" traz duas respostas.
   - **Para o médico:** a tripulação em ordem de prioridade ou uma pessoa específica, respeitando a privacidade.
2. **"From the guides":** busca nos textos do próprio app (guias de emergência e kit em voo, indicadores, riscos da Learn, check-in de sintomas e ajuda do app). O trecho é citado **palavra por palavra**, com a fonte e o link, e as palavras da pergunta ficam destacadas.

**Outros recursos:**
- **"Read the answer aloud"** lê a resposta.
- **Pergunta de emergência em voo** mostra **"Start SOS"** antes de tudo.
- **Sem resposta,** o assistente diz que não encontrou e sugere falar com o médico. **Nunca inventa.**
- O aviso **"Not a medical device"** fica sempre visível.
- **Nenhum modelo de linguagem** decide nada: os textos são modelos fixos, e a mesma pergunta sempre dá a mesma resposta.

---

## 12. Mensagens de saúde: lembretes, remédios e exames

Todo aviso temporário chega no chat **"Health messages"**, no canto inferior direito. Nada de pop-ups sobre a página, e os cards fixos não mudam.

- **Mensagem nova:** o chat **abre sozinho** (painel de 360 px), **sem roubar o foco**, e o leitor de tela anuncia a mensagem.
- **Cada mensagem tem** ícone, tipo, horário UTC, título, motivo e ações:
  - tarefa: **Done** e **In 15 min**;
  - remédio: **Taken** e **In 15 min**;
  - exame: **Got it** e **In 15 min**;
  - resultado: **Seen**;
  - quando há link: **Open**.
- **Remédios:** vitamina D (1000 UI) às **08:00 UTC** em voo, para os dois astronautas, e a pílula às **21:00 UTC**, quando o plano da saúde feminina usa pílula. "Taken" grava no mesmo registro do card da pílula.
- **Exames:** os exames antes do voo, 1 hora antes do horário marcado.
- **Resultados:** a leitura "Watch" ou "Act now" do ultrassom.
- **Médico:** cada alerta novo da tripulação. No primeiro acesso do dia, chega uma mensagem só, com o resumo.
- **Mensagem respondida** fica no histórico do dia ("Taken at 08:05 UTC", "Moved to 10:46 UTC"). O que é feito pelos cards (marcar a tarefa, medir a glicose, fazer o check-in) também fecha a mensagem.
- **Sem nada pendente,** o chat recolhe num **botão redondo com a contagem** de mensagens novas. **Minimize** ou **Esc** também recolhem, e o histórico continua ao trocar de página.
- **Emergências não vão para o chat.** O SOS tem o próprio diálogo.
- **Opcional, no Profile (card "Reminders"):** **"Speak reminders"** faz a voz falar os lembretes. **"Turn on device notifications"** ativa as notificações do sistema quando o app não está na tela.

---

## 13. Metas do dia e conquistas

Seção **Daily goals** na home.

- **4 metas por dia:**
  - **água**: 2,2 L de uma meta de 2,5 L;
  - **exercício**: 80% da meta da fase;
  - **sono**: 6 h 30 min ou mais;
  - **check-in de humor**.
- Um **anel de 4 partes** e a lista em texto mostram o progresso. A **sequência** de dias seguidos aparece numa faixa de 7 dias.
- **Check-in diário** (pelo botão **"Check in now"** ou pela tarefa "Mood check-in"):
  - humor de 1 a 5, com rostos;
  - estresse de 1 a 5;
  - nota privada opcional.
  - Só a equipe médica vê.
- **Conquistas privadas**, sem ranking: primeiro dia completo, 3, 7 e 30 dias seguidos, 7 dias de hidratação, 10 de exercício, 7 de sono e 14 check-ins. Cada uma mostra como ganhar e o progresso.
- **Ao fechar as 4 metas:** confete (sem animação com "reduzir movimento") e um aviso para o leitor de tela.

---

## 14. Privacidade

Página **Privacy**: **Who sees your health data**.

- **Quem vê cada tipo de dado:** **você**, o **médico de voo**, o **oficial médico de bordo** e **pesquisadores**.
  - **Sinais vitais:** o médico de voo sempre vê (segurança do voo); o médico de bordo vê se você permitir.
  - **Radiação:** sempre visível para os dois médicos (é preciso para mandar a tripulação ao abrigo numa tempestade solar).
  - **Corpo**, **saúde feminina**, **saúde masculina** e **humor e sono:** você escolhe quem vê.
  - **Notas da conferência privada:** nunca compartilhadas, ficam só entre você e o médico de voo.
- **"Why can't I turn some of them off?"** explica cada exceção.
- **Em emergência,** só a localização e os sinais daquele alerta vão para a tripulação, na hora.
- **What the flight director sees:** só "Fit for duty", nunca o motivo médico.
- **Pesquisadores:** só com consentimento e sem nome. Dá para parar quando quiser.
- **Gravação:** as mudanças são salvas na hora, no aparelho.

---

## 15. Riscos de saúde (Learn)

Página **"Your health risks"**, para todos os perfis. Abre pelo link "Learn about this risk" de cada indicador, por "Why this happens in space" nos guias e no check-in, e por "Your health risks" no Profile.

- **Em voo:** os **5 perigos da NASA** (radiação, isolamento, distância da Terra, gravidade e ambiente hostil) com os **17 riscos do Human Research Program**. Cada risco tem:
  - "What it does to your body";
  - "What the app watches for you", com o selo de hoje pelos sensores e links;
  - "What you can do".
- **Antes do voo:** por que cada exame é feito (certificação, audiograma, OCT, coletas, QCT, DXA, conferência, gravidez) e o treino físico.
- **Depois do voo:** a readaptação à gravidade.
- **Links com `#risk-…`** abrem e focam o risco certo.

---

## 16. Perfil (Profile)

- **Personal data:** nome, NASA ID, ID ou registro de médico, papel, sexo, idade e nascimento.
  - Para contas criadas no app: **Edit personal data**, **Change password** e **Delete this account**.
- **Your mission:** missão, destino, lançamento, pouso previsto, duração e fase, com o lembrete de que a fase muda ao sair e entrar de novo.
- **Voice assistant:**
  - ligar ou desligar a voz;
  - velocidade;
  - "I'm in…" (o módulo onde você está);
  - testar a voz.
- **Reminders:** falar os lembretes e notificações do aparelho.
- **Nausea mode:** "Simplify the screen now".
- **Your health risks:** atalho para a Learn.
- **Sign out.**

---

## 17. Destinos, fases e contextos de superfície

- **Destinos:** **estação espacial**, **Lua** e **Marte**. Cada destino tem o seu atraso de sinal, a sua gravidade, quem lidera a medicina, a sua taxa de radiação e o seu habitat (módulos do mapa).
- **Fases:** **antes**, **durante** e **depois do voo**, calculadas pelas datas da missão. Cada tela mostra só o que serve àquela fase. Na Terra não há radiação, clima espacial nem SOS, e o responsável médico é sempre o médico de voo.
- **Superfície (Lua e Marte):** fora dos dias na superfície, a tripulação está **em trânsito**. Na superfície há dois contextos:
  - **na base:** tarefa de limpar vedações e poeira;
  - **no rover:** saídas em dias pares, das 09:00 às 13:00 UTC, com a prontidão mínima de **85** em vez de 80, o kit do rover, água de hora em hora e a base a cerca de 40 minutos.

---

## 18. Modo de apresentação (Demo)

Botão de ícone no **fim do rodapé**. Um "!" no canto indica que algo está simulado, e o header diz " · simulated". Ele abre um painel que **simula**:

| Campo | O que simula |
|---|---|
| Mission destination | estação, Lua ou Marte |
| Mission phase | antes, durante ou depois do voo |
| Surface context | em trânsito, na base ou no rover (Lua e Marte) |
| Connection with Earth | sinal perdido |
| Health sensors | camisa tirada ou dispensador offline |
| Emergency (in flight) | dor no peito, colapso sem respirar, oxigênio baixo ou febre alta |

- **"Show the next reminder now"** manda o próximo lembrete ao chat.
- **"Back to the real mission"** limpa tudo.
- A opção automática de cada campo diz o valor real.

---

## 19. Acessibilidade e usabilidade

- **Padrão:** **WCAG 2.2 AA** e as 10 heurísticas de Nielsen. Testado com **axe-core**, sem violações, nos dois temas.
- **Contraste e status:** contraste de 4,5:1 ou mais. O status nunca aparece só pela cor: sempre há **ícone e texto**.
- **Teclado:** todo o app funciona pelo teclado, com o foco sempre visível e nunca escondido sob o header ou a tab bar. O 3D tem os cards e os atalhos de região como alternativa.
- **Toque:** alvos de 48×48 px ou mais.
- **Leitor de tela:** as mudanças são anunciadas (`aria-live`) sem roubar o foco, e os gráficos têm resumo em texto e tabela.
- **Temas:** claro e escuro.
- **Movimento:** a preferência "reduzir movimento" é respeitada. O **modo náusea** simplifica a tela.
- **Voz:** a voz tem sempre legenda escrita.
- **Rotas mortas:** nenhuma. O que ainda não existe aparece como "Coming soon".

---

## 20. Offline, dados e integração com o backend

- **Offline:** o **service worker** (`sw.js`) guarda o app inteiro, inclusive o modelo 3D, os guias e a Learn, e funciona sem conexão. Uma versão nova baixa os arquivos direto do servidor, sem misturar versões.
- **Dados de saúde** passam por `App.records` (`assets/js/records.js`), com os **mesmos nomes de tabela e coluna do backend** (`../db/schema.sql`, Supabase), validados como as regras `CHECK` do banco:
  - `sinais_vitais`: a glicose;
  - `exames_imagem`: o ultrassom, com a imagem no IndexedDB, no lugar do bucket `exames-imagem`;
  - `avaliacoes_diarias`: humor, estresse e gravidade do enjoo;
  - `gamificacao_metas`: as metas do dia;
  - `body_checkin`: os sintomas.
- **Hoje** tudo fica no aparelho. A integração futura troca só essa camada.
- **Tempo real entre aparelhos:** Firebase Firestore, só a coleção `missions/{missionId}/alerts`, com login anônimo e regras em `firestore.rules`.
- **Dados ao vivo da NASA:** o **DONKI** (clima espacial) usa a chave pública `DEMO_KEY`, limitada pela NASA a cerca de 30 pedidos por hora.

---

## 21. Tecnologia, estrutura, testes e deploy

- **Front-end:** **JavaScript puro (vanilla)**, HTML e CSS, sem frameworks.
- **Bibliotecas, todas locais em `assets/vendor/`:**
  - **Three.js r170**, para o 3D (com GLTFLoader, DRACOLoader e RoomEnvironment);
  - **Firebase JS SDK**, para os alertas em tempo real.
- **Estilo:** BEM, tokens de cor, espaçamento e tipografia, e abordagem mobile-first (414, 768 e 1140 px).
- **Desempenho:** meta de PageSpeed de 90 ou mais. O 3D e o Firebase só carregam depois da página.

```
app/
├── index.html            home (entrada, astronauta e médico)
├── sw.js                 service worker (offline)
├── assets/
│   ├── css/              colors, spacing, fonts, base
│   ├── js/               app, crew-data, records, glucose, symptoms, nausea-mode, inbox, reminders,
│   │                     assistant, assistant-data, guides, voice, habitat, crew-link, emergency-engine,
│   │                     astronaut-3d, ultrasound, goals, today-ring, health-info, charts…
│   ├── data/             missions.json, accounts.json, firebase-config.json
│   ├── models/emu.glb    traje EMU (NASA 3D Resources)
│   └── vendor/           three, firebase
├── pages/                vitals, body, emergency, learn, privacy, profile, womens-health, mens-health, home
├── tests/                Playwright (regressão + axe)
└── tools/                build, chrome (header, rodapé e tab bar em todas as páginas), serve, vendor
```

| Comando | O que faz |
|---|---|
| `npm run serve` | servidor local na porta 8080 |
| `npm run chrome` | regrava o header, o rodapé, a tab bar e os diálogos comuns em todas as páginas |
| `npm run build` | gera o `dist/` minificado e para se algum JS gerado não passar na checagem de sintaxe |
| `npm test` | Playwright em 414 e 1280 px: regressão, emergência ponta a ponta e axe |
| `npm run test:a11y` | só os testes de acessibilidade |
| `firebase deploy --only hosting` | publica o `dist/` (o build roda antes, sozinho) |

- **Firebase:** projeto `spaceapps2026-infinitygirls`, plano gratuito Spark.

---

**Créditos:**
- modelo 3D do traje EMU: NASA 3D Resources;
- limite de radiação: NASA Office of the Chief Health and Medical Officer;
- clima espacial: NASA DONKI;
- fontes: Fira Sans e Overpass (SIL Open Font License).
