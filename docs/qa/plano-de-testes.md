# 🧪 Plano e Roteiro de Testes Manuais — AstroHealth

**Responsável QA:** Rafaela Protasio  
**Projeto:** AstroHealth (NASA Space Apps Challenge 2026 — Equipe Infinity Girls)  
**Escopo:** Validação funcional, usabilidade, segurança (RLS), alertas críticos e suporte offline-first.

---

## 1. Matriz de Cenários de Teste

| ID | Módulo | Cenário de Teste | Pré-condição / Entrada | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CT-01** | Body Check-in | Seleção de região anatômica e registro de sintoma | Selecionar região (ex: Cabeça) e intensidade `4` | Sintoma salvo e protocolo de primeiros socorros exibido imediatamente | ⏳ Pendente |
| **CT-02** | Telemetria | Registro de sinais vitais dentro da faixa normal | `SpO₂: 98%`, `FC: 75 bpm`, `PA: 120/80 mmHg` | Leitura armazenada sem disparo de alerta crítico | ⏳ Pendente |
| **CT-03** | Alertas (Trigger) | Disparo de anomalia por baixa oxigenação (`SpO₂ < 95%`) | Inserir `SpO₂: 92%` | Gatilho `verificar_anomalia_vital` dispara alerta crítico na interface | ⏳ Pendente |
| **CT-04** | Alertas (Trigger) | Disparo de anomalia por taquicardia (`FC > 110 bpm`) | Inserir `FC: 118 bpm` | Alerta crítico acionado com protocolo autônomo | ⏳ Pendente |
| **CT-05** | Alertas (Trigger) | Disparo de anomalia por hipertensão (`PA > 180 mmHg`) | Inserir `PA: 185/110 mmHg` | Alerta crítico acionado imediatamente | ⏳ Pendente |
| **CT-06** | Exames & RLS | Controle de acesso ao bucket privado `exames-imagem` | Usuário perfil Astronauta vs. Oficial Médico (`eh_medico()`) | Apenas o perfil médico consegue emitir laudo e parecer clínico | ⏳ Pendente |
| **CT-07** | SANS & Saúde Mental | Check-in diário de humor/estresse e contramedidas | Registrar humor (1–5) e uso de manguito de coxa / Complexo B | Dados registrados de forma privada, sem exposição pública | ⏳ Pendente |
| **CT-08** | Gamificação | Conclusão de meta diária de hidratação (`2.500 ml`) | Registrar ingestão acumulada de `2.500 ml` | Desbloqueio de conquista individual sem ranking competitivo | ⏳ Pendente |
| **CT-09** | Offline-First | Operação sem conexão via Service Worker (`sw.js`) | Desativar rede no navegador e registrar check-in | Aplicação continua funcional e sincroniza ao restabelecer conexão | ⏳ Pendente |
| **CT-10** | Ergonomia Visual | Legibilidade e contraste da paleta Deep Space Navy | Navegar pelas telas principais em ambiente escuro | Alto contraste mantido (`#030F26` / `#FFFFFF` / `#00D2FF`) sem fadiga ocular | ⏳ Pendente |
| **CT-11** | Autenticação & Perfil | Bloqueio de acesso a rotas protegidas sem login | Acessar URL direta do painel sem sessão ativa | Usuário redirecionado para tela de login; nenhum dado clínico exibido | ⏳ Pendente |
| **CT-12** | Body Check-in | Validação de campos obrigatórios e limites de escala | Tentar salvar sintoma sem região selecionada ou intensidade fora de `1–5` | Sistema impede o envio e exibe mensagem clara de validação | ⏳ Pendente |
| **CT-13** | Telemetria | Limites de borda (Boundary Value) dos sinais vitais | Inserir valores exatos no limite (`SpO₂: 95%`, `FC: 110 bpm`, `PA: 180/90 mmHg`) | Verificar comportamento exato do gatilho e regras de aceitação | ⏳ Pendente |
| **CT-14** | Exames & RLS | Isolamento de dados entre astronautas (RLS) | Astronauta A tenta acessar exame enviado pelo Astronauta B | Acesso negado; cada usuário visualiza apenas os próprios registros | ⏳ Pendente |
| **CT-15** | Exames | Upload de arquivo inválido ou acima do limite permitido | Tentar enviar arquivo `.exe` ou imagem corrompida no envio de exame | Upload bloqueado com aviso de formato/tamanho suportado | ⏳ Pendente |
| **CT-16** | Offline-First | Resolução de fila offline após múltiplas ações | Registrar 2 check-ins e 1 telemetria offline, depois reconectar | Todos os 3 registros sincronizam na ordem correta sem duplicidade | ⏳ Pendente |
| **CT-17** | Responsividade | Adaptação de layout em dispositivos móveis e tablets | Abrir aplicação em viewport `375x812` (mobile) e `768x1024` (tablet) | Mapa corporal, gráficos e alertas permanecem clicáveis sem quebra | ⏳ Pendente |

---

## 2. Suíte de Regressão (Smoke & Sanity Check)

> *Executar este conjunto resumido de cenários críticos sempre que houver novo deploy ou correção de bug mesclada na branch `main`.*

* **Fluxo Crítico 01 (Segurança & RLS):** Validação de rotas protegidas e isolamento de dados entre perfis (`CT-06`, `CT-11`, `CT-14`).
* **Fluxo Crítico 02 (Emergência Médica):** Inserção de sinais vitais críticos e disparo imediato de alertas de anomalia (`CT-03`, `CT-04`, `CT-05`).
* **Fluxo Crítico 03 (Continuidade Offline):** Registro de check-in sem internet e sincronização automática via Service Worker (`CT-09`, `CT-16`).
* **Fluxo Crítico 04 (Core Funcional):** Seleção no mapa do Body Check-in e exibição de protocolos (`CT-01`, `CT-12`).

---

## 3. Registro de Execução e Bugs Encontrados

> *Atualizar esta seção a cada rodada de testes manuais realizada.*

* **Rodada 01 (Data: Pendente):** Aguardando primeira execução oficial na branch principal.
