# Análise de cobertura: o app resolve os problemas pesquisados?

Atualizado em 13 de novembro de 2026, depois da Fase 1 e da primeira parte da Fase 2 do plano (`pesquisas/plano-de-implementacao.md`): emergência com voz, alerta à tripulação em tempo real e "como medir / por que importa" (Fase 1); página Learn com os riscos e ambientes de superfície (Fase 2). Compara o que o app faz hoje com o vídeo oficial e o enunciado do desafio, as fontes da NASA e da CSA e a pesquisa própria da equipe (pasta `pesquisas/`). Versão em PDF focada nas lacunas: `pesquisas/lacunas-do-app.pdf`.

Legenda de status: **Resolve** (o app atende e dá para mostrar na demo), **Parcial** (atende uma parte; a lacuna está anotada) e **Não resolve** (nada no app hoje). Cada linha diz onde está no app.

---

## 1. Resumo

**Veredito: o app ainda não resolve 100% dos problemas, mas a cena do vídeo oficial agora está coberta.** Quando um tripulante desmaia, a camisa detecta, a voz do aparelho diz os sinais vitais e o que fazer, a tripulação recebe o alerta na hora com a localização no mapa, e o guia de reanimação traz metrônomo e cronômetro. Cada indicador explica como é medido e por que importa. A página Learn explica cada risco da fase, e Lua e Marte têm trânsito, base e rover. Continuam faltando os exemplos de entrada do enunciado (glicose, ultrassom), a gamificação, os lembretes ativos e os riscos que nenhum sensor mede.

| Bloco | Itens | Resolve | Parcial | Não resolve |
|---|---|---|---|---|
| Vídeo oficial do desafio | 9 | 6 | 2 | 1 |
| Requisitos do enunciado | 10 | 6 | 2 | 2 |
| 5 perigos da NASA | 5 | 2 | 3 | 0 |
| 17 riscos do HRP | 17 | 4 | 6 | 7 |
| Pesquisas em andamento (HRP) e CSA | 17 | 4 | 5 | 8 |
| Pesquisa própria (telas, regras, oportunidades, dores) | 37 | 27 | 7 | 3 |
| **Total** | **95** | **49 (52%)** | **25 (26%)** | **21 (22%)** |

Um item da pesquisa própria (projeto de trajes) ficou fora do escopo de um app e não entra na conta.

**As 5 lacunas que mais pesam na avaliação** (critérios: impacto, criatividade, validação, relevância e apresentação):

1. **Glicose e exames de sangue.** O enunciado cita glicose em mg/dL; hoje todos os dados vêm dos sensores.
2. **Imagem de ultrassom.** O outro exemplo do enunciado e uma pesquisa atual da NASA (coagulação venosa).
3. **Gamificação.** Só existem sequências de dias e o contador de tarefas.
4. **Dados do OSDR.** O vídeo pede para usar o repositório de ciência aberta da NASA; hoje só o DONKI é usado.
5. **Lembretes ativos.** O vídeo pede para lembrar a tripulação de medir; hoje há tarefas, mas nenhum aviso na hora certa.

Resolvido na Fase 1: a emergência com tripulante desacordado (antiga lacuna 1) e "como medir / por que importa" em cada indicador. Resolvido na Fase 2: a explicação de cada risco (página Learn, antiga lacuna 5) e os ambientes de superfície (antiga lacuna 6).

---

## 2. Fontes analisadas

Do desafio:
- Vídeo oficial do desafio (transcrição colada pela equipe em 13/11/2026)
- Texto do enunciado do desafio
- NASA Open Science Data Repository (OSDR), citado no vídeo: https://osdr.nasa.gov

NASA e CSA:
- NASA HRP, os 5 perigos: https://www.nasa.gov/hrp/hazards/
- NASA HRP, os 17 riscos: https://www.nasa.gov/hrp/risks/
- NASA HRP, pesquisas em andamento: https://www.nasa.gov/hrp/ongoing-hrp-research/
- CSA, monitoramento de radiação (espectrômetro de nêutrons CANS): https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- CSA, por que fazer ciência no espaço: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp

Da equipe (pasta `pesquisas/`):
- `pesquisa-ux-astronautas-figjam/07-telas-do-prototipo.csv` (9 telas e 3 regras)
- `pesquisa-ux-astronautas-figjam/11-oportunidades.csv`
- `dores-saude-astronautas.pdf`, `monitoramento-astronautas.pdf`, `monitoramento-homens-mulheres.pdf`
- `Projetos avaliados por 5 critérios.txt`

---

## 3. Vídeo oficial do desafio

| O que o vídeo pede | Status | Onde está / o que falta |
|---|---|---|
| Software que ajude o astronauta a avaliar a própria saúde | Resolve | Home: astronauta 3D, cards compactos e prontidão; Vitals (Today, Weekly, Overall). |
| Orientar o que fazer numa emergência (dor forte no peito e desmaio a meio caminho de Marte) | Resolve | Fase 1: a camisa detecta que a pessoa parou de respirar (ou ela toca em **SOS**); a voz do aparelho diz os sinais vitais e o que fazer (para quem está perto, quando a pessoa não pode agir); a tripulação recebe o alerta em tempo real com a localização no mapa e responde "I'm on my way"; o diálogo guia um passo por vez, com registro UTC. Guia novo "Not responding or not breathing", com metrônomo de 110 por minuto e ciclo de 2 minutos, e o botão "The person collapsed" a partir de "Chest pain". Tudo offline (`assets/js/emergency-engine.js`, `voice.js`, `crew-link.js`, `guides.js`). |
| Explicar como fazer cada medição | Resolve | Fase 1: cada indicador diz "How it is measured" (Vitals e card da home), e cada passo de guia que usa o kit diz como usar o ECG, o oxímetro, a lanterna, o desfibrilador, o oxigênio, o autoinjetor e o torniquete. |
| Explicar por que cada medição importa | Resolve | Fase 1: "Why it matters" em cada indicador, ao lado de "What to do", com "Explain out loud" (`App.renderHealthInfo`). |
| Dizer o que fazer quando um valor não está normal | Resolve | "O que fazer" por indicador e status, linha "Back to normal when", nova leitura automática, guias de decisão do médico. |
| Lembrar a tripulação de fazer as medições | Parcial | Tarefas do dia, nova leitura automática da camisa e agenda de exames antes do voo. Não há aviso ativo na hora certa (banner ou notificação) nem "próxima medição" visível. |
| Adaptar a nave, estação ou base na superfície da Lua | Resolve | Estação, Lua e Marte como destino (`MODES` em `assets/js/app.js`). Na Fase 2, cada missão de Lua e Marte tem trânsito, base e rover (`App.getContext`): o mapa muda (Orion, base lunar, veículo de transporte, base em Marte, rover com kit próprio), as tarefas e os conselhos ganham poeira e hidratação na travessia, a prontidão pede 85 para o rover e o médico vê quem está fora da base e o tempo até ela. |
| Usar o repositório de ciência aberta da NASA (OSDR) para inspirar e testar | Não resolve | O app usa só o DONKI (clima espacial). O OSDR não aceita chamada direta do navegador (CORS). |
| Inspirar ferramentas de saúde na Terra (comunidades remotas) | Parcial | O app já funciona offline, com guias sem médico e explicações simples, mas não diz nem mostra isso. |

---

## 4. Requisitos do enunciado

| Requisito | Status | Onde está / o que falta |
|---|---|---|
| Ferramenta visual para o astronauta avaliar a própria saúde | Resolve | Home: astronauta 3D com 8 pontos de sensor, cards compactos e prontidão de 0 a 100 (`index.html`, `assets/js/astronaut-3d.js`). |
| Orientação de tratamento e melhoria | Parcial | "O que fazer" em cada indicador, nova leitura da camisa, guias de decisão do médico e guias de emergência offline. Falta orientação de longo prazo para o próprio astronauta (ossos, visão, sono e humor ao longo da missão). |
| Qualquer tipo de entrada (exemplo: glicose em mg/dL) | Não resolve | Os dados vêm só dos sensores (camisa, dispensador de água, aparelhos de exercício). A única entrada manual é a fita de urina, no painel do médico. |
| Imagens como indicador (exemplo: ultrassom) | Não resolve | Não há envio nem registro de imagem. O OCT aparece só como número. |
| Diferentes ambientes (nave, estação, veículo explorador, base) | Resolve | Estação, nave em trânsito (Orion e veículo para Marte), base na Lua e em Marte e rover pressurizado (Fase 2), simuláveis no Presentation mode. |
| Pedir medições e ações de tempos em tempos | Resolve | "Health tasks today", nova leitura automática da camisa e agenda de exames antes do voo (`pages/home/exams.js`). |
| Gamificação | Parcial | Sequência atual e melhor sequência na aba Overall (`pages/vitals/vitals.js`) e contador "X of Y done". Faltam metas, conquistas e recompensa. |
| Gráficos dinâmicos ao longo do tempo | Resolve | Linha de 24 h, semana, grade de todos os dias da missão (Vitals), massa e osso (Body), dose acumulada e projetada (home). |
| Código de cores para leitura rápida | Resolve | OK / Watch / Act now com cor, ícone, texto e textura, nos dois temas. |
| Instruções e explicações simples (medições, indicadores, riscos) | Resolve | Ajuda contextual em `<details>` na home, Body, Vitals e módulos; "How it is measured / Why it matters" em cada indicador (Fase 1); página Learn com os 5 perigos e os 17 riscos do HRP em linguagem simples, por fase, com links a partir de cada indicador, de cada guia de emergência e do Profile (Fase 2). |

---

## 5. Os 5 perigos da NASA

| Perigo | Status | Onde está / o que falta |
|---|---|---|
| Radiação | Resolve | Dose acumulada com limite de carreira de 600 mSv e projeção, clima espacial ao vivo (NASA DONKI), abrigo contra tempestade. |
| Distância da Terra | Resolve | Atraso por destino, oficial médico decide em Marte, guias offline, aviso de sem ligação com a Terra. |
| Gravidade alterada | Parcial | Ossos e músculos (Body), readaptação depois do pouso, teste de ficar em pé. As faixas normais não mudam com a gravidade. |
| Isolamento e confinamento | Parcial | Só a tarefa "Mood check-in" e a linha "Mood and sleep" para o médico. |
| Ambiente fechado e hostil | Parcial | Ruído na cabine (módulo masculino). Faltam CO₂, temperatura da cabine e micro-organismos. |

---

## 6. Os 17 riscos do HRP

| Risco | Status | Onde está / o que falta |
|---|---|---|
| Resposta imune alterada | Parcial | Coleta de saliva e coletas antes do voo, sem indicador nem tendência. |
| Função sensório-motora e vestibular | Parcial | Reabilitação depois do pouso e aviso de tontura. Falta enjoo e equilíbrio na troca de gravidade. |
| Adaptações cardiovasculares | Resolve | Frequência cardíaca e pressão contínuas, teste de ficar em pé, preparo para o retorno no módulo feminino. |
| Doença descompressiva | Não resolve | A prontidão diz "Ready for EVA", mas sem pré-respiração nem sintomas. |
| Interação com micro-organismos | Não resolve | Só os sintomas urinários. Nada sobre micróbios no ambiente. |
| Hipóxia | Parcial | SpO₂ contínua. Falta o oxigênio e o CO₂ da cabine. |
| Alimentação e nutrição inadequadas | Não resolve | Só hidratação e massa corporal. |
| Lesão e desempenho em caminhada espacial | Não resolve | Nenhum registro de lesão de mão ou ombro nem de carga. |
| Aptidão cardiorrespiratória e musculoesquelética | Resolve | Exercício pelos aparelhos, meta diária, músculo e força (Body). |
| SANS, o principal risco da NASA hoje | Parcial | Tendência do OCT com alerta. Faltam sintomas e contramedidas. |
| Mudanças nos ossos | Resolve | Densidade óssea, DXA antes e depois, plano de exercício (Body). |
| Mudanças de comportamento e transtornos psiquiátricos | Parcial | Só o check-in de humor. |
| Trabalho em equipe inadequado | Não resolve | Nada sobre a dinâmica da tripulação. |
| Sono inadequado e horários irregulares | Parcial | Sono pela camisa, alerta de noites curtas. Falta luz e ritmo circadiano. |
| Suporte inadequado às operações | Não resolve | Risco de fatores humanos dos sistemas da nave; o app só ajuda indiretamente, com interface clara. |
| Lesão por cargas dinâmicas (lançamento e pouso) | Não resolve | Nenhum registro de desconforto no lançamento e no pouso. |
| Câncer causado por radiação | Resolve | Dose acumulada até o limite de carreira e contexto reprodutivo (módulo masculino). |

---

## 7. Pesquisas em andamento do HRP e da CSA

| Estudo ou tema | Status | Onde está / o que falta |
|---|---|---|
| ARCHeR (Artemis II): sono, atividade e luz por actigrafia de pulso | Parcial | Sono e atividade pela camisa; falta a luz. |
| Biomarcadores imunes (sangue e saliva) | Parcial | Coletas sem resultado nem tendência. |
| Medidas padrão (Artemis II e estação), fisiológicas e psicológicas | Parcial | As fisiológicas sim; as psicológicas não. |
| B-Complex: vitamina B contra mudanças no olho e no cérebro | Não resolve | Sem registro de suplemento. |
| Pressão do líquido cerebral | Não resolve | Fora do alcance de um sensor vestível; serve de contexto para a SANS. |
| CIPHER: vários sistemas do corpo em conjunto | Resolve | Sinais vitais, corpo, visão, radiação e exames num só lugar por astronauta. |
| Pilotagem manual depois da troca de gravidade | Não resolve | Sem teste de prontidão sensório-motora. |
| Proteção do ocupante: desconforto na reentrada | Não resolve | Sem questionário depois do pouso. |
| Biomarcadores no líquido da coluna | Não resolve | Exame invasivo, fora do escopo do app. |
| Manguito de coxa contra a SANS | Não resolve | Sem registro de uso. |
| Hemostasia venosa (fluxo e coagulação, por ultrassom) | Não resolve | Sem ultrassom. |
| Zero T2: exercício sem esteira | Resolve | O exercício é registrado pelos aparelhos de bordo, seja qual for. |
| CSA: nêutrons, cerca de 30% da radiação na estação (CANS) | Parcial | A dose aparece como total, sem separar os nêutrons. |
| CSA: metabolismo e diabetes tipo 2 | Não resolve | Sem glicose. |
| CSA: ossos e osteoporose | Resolve | Body. |
| CSA: coração e vasos | Resolve | Sinais vitais. |
| CSA: equilíbrio | Parcial | Só depois do pouso. |

---

## 8. Pesquisa própria

### Telas do CSV 07

| Tela | Status | Onde está |
|---|---|---|
| 1. Início do astronauta | Resolve | `index.html` |
| 2. Sinais vitais | Resolve | `pages/vitals/` |
| 3. Corpo | Resolve | `pages/body/` |
| 4. Módulo feminino | Resolve | `pages/womens-health/` |
| 5. Módulo de atenção masculina | Resolve | `pages/mens-health/` |
| 6. Privacidade | Resolve | `pages/privacy/` |
| 7. Painel do oficial médico | Resolve | Home do médico (`pages/home/crew-panel.js`) |
| 8. Painel do médico de voo em terra | Parcial | O perfil médico é o oficial médico de bordo; falta o atraso de cada dado. |
| 9. Status da conexão | Não resolve | Card "Connection" com o selo "Coming soon". |
| Regra: hora da última leitura | Resolve | "Last sync" e "Data from" |
| Regra: modo da missão visível | Resolve | Header e Profile |
| Regra: módulos por sexo ativados pela pessoa | Resolve | Os módulos podem ser desligados |

### Oportunidades do CSV 11

| Oportunidade | Status |
|---|---|
| Juntar sensores, exames e registros num só painel | Resolve |
| Guias de decisão que funcionam sem a Terra | Resolve |
| Dose de radiação com contexto, inclusive reprodutivo | Resolve |
| Ciclo, anticoncepcional e estoque por missão | Resolve |
| Controle sobre quem vê cada dado | Resolve |
| Readaptação à gravidade com atenção às mulheres | Resolve |
| Tendência da visão com atenção aos homens | Resolve |
| Sintomas urinários registrados cedo | Resolve |
| Ajustar referências de normal a cada gravidade | **Não resolve**: as faixas são iguais nos três destinos. |
| Dados consentidos para a pesquisa sobre mulheres | Resolve |
| Reduzir o registro manual | Resolve |

### Dores (`dores-saude-astronautas.pdf`)

| Dor | Status | Observação |
|---|---|---|
| Ossos e músculos (para todos) | Resolve | Body |
| SANS sem prevenção comprovada | Parcial | Ver a seção 6 |
| Atendimento sem a Terra | Resolve | Guias offline, oficial médico decide |
| Mulheres: desmaio ao ficar em pé depois do retorno | Resolve | "Return to gravity" |
| Mulheres: fertilidade e reprodução | Parcial | Anticoncepcional e ciclo sim; fertilidade não. |
| Mulheres: o exercício funciona igual para elas? | Parcial | O plano é o mesmo para todos. |
| Mulheres: radiação e câncer | Parcial | O limite é o mesmo, sem contexto específico. |
| Mulheres: mais enjoo de movimento | Não resolve | Sem registro de enjoo. |
| Mulheres: sistema imune | Parcial | Só as coletas. |
| Mulheres: infecção urinária | Resolve | Sintomas urinários com alerta |
| Mulheres: menstruação em missões longas | Resolve | Plano do ciclo e estoque |
| Mulheres: trajes e equipamentos | Fora do escopo | É projeto de hardware. |
| Homens: visão | Resolve | Módulo masculino |
| Homens: audição | Resolve | Ruído e teste de audição |
| Homens: reprodução | Parcial | Contexto da radiação, sem acompanhamento hormonal. |

---

## 9. Lacunas priorizadas (23; 1 resolvida na Fase 1 e 2 na Fase 2)

Esforço: **P** = até meio dia, **M** = 1 a 2 dias, **G** = 3 dias ou mais. Prioridade 1 é o que o vídeo e o enunciado pedem explicitamente.

### Prioridade 1: pedido explícito do desafio

| # | Lacuna | Fonte | Sugestão | Esforço |
|---|---|---|---|---|
| 1 | ~~Emergência: tripulante que não responde ou não respira~~ **Resolvido na Fase 1** | Vídeo oficial (dor no peito e desmaio a caminho de Marte) | Guia "Not responding or not breathing" em `pages/emergency/`: ver se responde e respira, chamar o oficial médico, reanimação adaptada à microgravidade, desfibrilador do kit, cronômetro e registro de cada passo com horário UTC. O guia "Chest pain" leva direto a ele quando a pessoa desmaia. Sugestão de guia, a validar com médico de voo. | P |
| 2 | Glicose e exames de sangue | Enunciado; CSA (metabolismo) | Card "Blood glucose (mg/dL)" de um glicosímetro de bordo (ou entrada guiada passo a passo), com faixa normal, cor, tendência e "o que fazer"; resultados das coletas imunes no mesmo lugar. | M |
| 3 | Imagem de ultrassom | Enunciado; Hemostasia venosa (HRP) | Exame guiado de ultrassom da veia do pescoço: passo a passo de captura, imagem salva por data e status dado pelo médico, sem diagnóstico automático. | G |
| 4 | Gamificação | Enunciado | Metas semanais por tarefa de saúde, conquistas por sequência e progresso na home, sem competição nem exposição de dados. | M |
| 5 | ~~Explicar cada risco~~ **Resolvido na Fase 2** | Vídeo oficial ("astronautas não são médicos"); enunciado; HRP | Página Learn (`pages/learn/`): em voo, os 5 perigos e os 17 riscos do HRP, cada um com o que faz no corpo, o que o app mede (com o status de hoje) e o que fazer; antes do voo, o porquê de cada exame; depois, a readaptação. Link em cada indicador, em cada guia e no Profile. | P |
| 6 | ~~Ambientes de superfície~~ **Resolvido na Fase 2** | Vídeo oficial (base na Lua); enunciado | Trânsito, base e rover em Lua e Marte, pelas datas da missão e pela rotina UTC (simuláveis no Presentation mode): mapa, tarefas (poeira, kit do rover, água na travessia), conselhos, prontidão (85 no rover) e ficha do médico. | M |

### Prioridade 2: indicado no vídeo e principais riscos do HRP

| # | Lacuna | Fonte | Sugestão | Esforço |
|---|---|---|---|---|
| 7 | Lembretes ativos | Vídeo oficial ("remind the crew") | Aviso no app na hora de cada tarefa ou medição, "próxima medição" visível na home e notificação do sistema só com permissão. | M |
| 8 | Dados do OSDR | Vídeo oficial | Cópia de um conjunto de dados humanos de voo do OSDR, gerada no build (o navegador não acessa o OSDR direto), com crédito, para conferir faixas e testar o card de glicose. Conjunto a confirmar no OSDR (exemplo: exames de sangue de tripulações). | M |
| 9 | SANS: sintomas e contramedidas | HRP (principal risco); B-Complex; Thigh Cuff | Teste rápido de visão de perto, relato de visão turva, registro de complexo B e de manguito de coxa, junto da tendência do OCT. | M |
| 10 | Nutrição | HRP | Ingestão diária (calorias, proteína, vitamina D, cálcio) com meta e status. | M |
| 11 | Enjoo e equilíbrio na troca de gravidade | HRP (sensório-motor); dor das mulheres | Escala de enjoo nos primeiros dias depois de cada troca de gravidade e teste de equilíbrio antes de tarefas críticas. | M |
| 12 | Humor e estresse | HRP (comportamento); isolamento | Check-in com escala, tendência e recursos de apoio. | M |
| 13 | Tendência imune | HRP (imune) | Resultado das coletas em linha do tempo. | P |
| 14 | Faixas normais por gravidade | CSV 11 | Faixas de frequência cardíaca, pressão e exercício por destino, com a referência visível. | P |
| 15 | Nêutrons no card de radiação | CSA (CANS) | Separar a parte de nêutrons na dose e explicar por que pesa mais. | P |

### Prioridade 3: completa a cobertura

| # | Lacuna | Fonte | Sugestão | Esforço |
|---|---|---|---|---|
| 16 | Descompressão antes da caminhada espacial | HRP | "Ready for EVA" inclui a pré-respiração; relato de sintomas e dor depois da caminhada. | P |
| 17 | Ambiente da cabine | Ambiente fechado; hipóxia | CO₂, oxigênio e temperatura da cabine em voo. | P |
| 18 | Trabalho em equipe | HRP | Pergunta semanal opcional, privada, só para o médico. | P |
| 19 | Desconforto no lançamento e no pouso | HRP (cargas dinâmicas); Occupant Protection | Questionário curto depois do pouso, ligado à reabilitação. | P |
| 20 | Tela Connection | CSV 07 (tela 9) | O que foi enviado, o que está guardado e o atraso atual. | M |
| 21 | Médico de voo em terra com o atraso de cada dado | CSV 07 (tela 8) | Modo "Ground" no painel do médico com a idade de cada dado. | M |
| 22 | Luz e ritmo circadiano | ARCHeR | Exposição à luz e horário de sono no detalhe de Sleep. | P |
| 23 | Uso na Terra | Vídeo oficial (comunidades remotas) | Na apresentação e numa linha do app, mostrar como funcionar offline, guias sem médico e explicações simples servem a comunidades com pouco acesso a saúde. | P |

---

## 10. Limites do protótipo

- Os dados de saúde são simulados (determinísticos, iguais em todas as telas); só o clima espacial é real (NASA DONKI).
- Não há servidor: contas, senhas e agendas ficam no aparelho; a tela avisa que não é segurança real.
- Guias e faixas de referência são exemplos simplificados, não instruções médicas validadas.
- O checklist do hackathon está atendido: usa dado da NASA (DONKI), está todo em inglês e roda no navegador sem baixar nada (e offline depois da primeira visita).
