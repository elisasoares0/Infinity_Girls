<div align="center">

<!-- BANNER SUPERIOR ANIMADO (ONDA AZUL, ROSA & BRANCO) -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:030F26,45:0B3D91,80:FF4D94,100:00D2FF&height=210&section=header&text=AstroHealth&fontSize=58&fontColor=FFFFFF&fontAlignY=38&desc=Infinity%20Girls%20%E2%80%A2%20NASA%20Space%20Apps%20Challenge%202026&descSize=18&descAlignY=62&descColor=FFFFFF&animation=twinkling" width="100%" alt="Banner AstroHealth" />

<!-- TYPING SVG DINÂMICO -->
<a href="https://spaceapps2026-infinitygirls.web.app/">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=19&duration=3000&pause=1000&color=FF66B2&center=true&vCenter=true&multiline=false&width=780&height=42&lines=Monitoramento+Biom%C3%A9dico+Aut%C3%B4nomo+para+Miss%C3%B5es+Espaciais;Mitigando+os+5+Riscos+do+Human+Research+Program+da+NASA;Telemetria+em+Tempo+Real+%E2%80%A2+PostgreSQL+%2B+RLS+%E2%80%A2+Python+%2B+Web" alt="Typing SVG" />
</a>

<br/>

<!-- BADGES TEMÁTICOS AZUL, ROSA & BRANCO -->
[![NASA Space Apps](https://img.shields.io/badge/NASA_Space_Apps_Challenge-2026-0B3D91?style=for-the-badge&logo=nasa&logoColor=FFFFFF)](https://www.spaceappschallenge.org/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Firebase_Hosting-00D2FF?style=for-the-badge&logo=firebase&logoColor=030F26)](https://spaceapps-infinitygirls.web.app/)
[![Equipe](https://img.shields.io/badge/Equipe-Infinity_Girls-FF4D94?style=for-the-badge&logo=sparkles&logoColor=FFFFFF)](#-equipe-infinity-girls)
[![Database](https://img.shields.io/badge/PostgreSQL-Supabase_%2B_RLS-FFFFFF?style=for-the-badge&logo=supabase&logoColor=0B3D91)](db/schema.sql)
[![Python](https://img.shields.io/badge/Back--end-Python_3.10+-030F26?style=for-the-badge&logo=python&logoColor=FF85B3)](ASTROHEALTH-db.py)


[🌌 Sobre a Missão](#-sobre-a-missão) •
[🎨 Identidade Visual](#-identidade-visual-azul--branco) •
[✨ Funcionalidades](#-funcionalidades-principais) •
[🏗️ Arquitetura](#️-arquitetura-do-sistema) •
[📂 Estrutura do Repositório](#-Estrutura-do-Repositório) •
[🚀 Como Executar](#-como-executar-o-projeto) •
[👩‍🚀 Equipe](#-equipe-infinity-girls)

</div>

<!-- DIVISOR ANIMADO -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="Divisor" />



## 🌌 Sobre a Missão

🌌 Sobre a Missão
O AstroHealth é uma plataforma interativa de monitoramento biomédico e autogestão de saúde desenvolvida pela equipe **Infinity Girls** para o **NASA Space Apps Challenge 2026** (Create Health Monitoring Software for Astronauts on Space Missions) para garantir a autonomia da tripulação em missões espaciais de longa duração (como missões lunares do programa Artemis ou viagens a Marte). 

Em expedições de espaço profundo — como o programa **Artemis** na Lua ou missões tripuladas a **Marte** — a comunicação com a Terra sofre atrasos de até **44 minutos** (ida e volta). O AstroHealth capacita a tripulação a registrar sinais vitais, realizar autoavaliações anatômicas, enviar exames de imagem e receber protocolos médicos imediatos com **baixa carga cognitiva** e total autonomia.

---

### 🛰️ Mitigação dos 5 Riscos dos Voos Espaciais Tripulados (NASA HRP)

| Risco Espacial (NASA) | Impacto Fisiológico | Solução Integrada no AstroHealth |
| :--- | :--- | :--- |
| 🪐 **Campos Gravitacionais** | Alterações cardiovasculares, perda óssea e enjoo na troca de gravidade | Monitoramento de pressão arterial, FC, nutrição (Vitamina D / Cálcio) e escala vestibular |
| ☣️ **Radiação Espacial** | Alterações imunológicas e estresse celular | Registro periódico de marcadores imunes salivares e cetonas |
| 🏠 **Ambiente Fechado Hostil** | Desidratação, desequilíbrio nutricional e qualidade do habitat | Controle de calorias, proteínas, hidratação diária e contexto da missão (`base` / `rover`) |
| 🧠 **Isolamento e Confinamento** | Oscilações de humor, estresse e distúrbios do sono | Check-in diário privado de humor/estresse (1–5) e gamificação individual sem exposição pública |
| 📡 **Distância da Terra** | Impossibilidade de telemedicina síncrona em emergências | Triggers automáticos no banco de dados para alertas críticos e protocolos autônomos offline-first |

---

## 🎨 Identidade Visual (Azul & Branco)

A interface foi projetada com alto contraste e ergonomia visual espacial, priorizando tons profundos de **Azul** e tipografia em **Branco Puro** para leitura instantânea sem fadiga ocular:

<div align="center">

| Amostra | Token | Código HEX | Aplicação na Interface |
| :---: | :--- | :---: | :--- |
| ![#030F26](https://via.placeholder.com/24/030F26/030F26.png) | **Deep Space Navy** | `#030F26` | Fundo principal do painel e estrutura da estação |
| ![#0B3D91](https://via.placeholder.com/24/0B3D91/0B3D91.png) | **NASA Cobalt Blue** | `#0B3D91` | Cabeçalhos, bordas estruturais e identidade institucional |
| ![#00D2FF](https://via.placeholder.com/24/00D2FF/00D2FF.png) | **Telemetry Cyan** | `#00D2FF` | Botões primários, hotspots anatômicos e sinais vitais normais |
| ![#FFFFFF](https://via.placeholder.com/24/FFFFFF/FFFFFF.png) | **Starlight White** | `#FFFFFF` | Textos principais, valores biométricos e ícones de alto contraste |

</div>

---

## ✨ Funcionalidades Principais

* 🧍 **Body Check-in Interativo:** Modelo anatômico clicável por região (cabeça, tórax, abdômen, membros) para registro rápido de sintomas, intensidade (1 a 5) e exibição imediata de protocolos de primeiros socorros.
* 📈 **Telemetria & Exames Laboratoriais:** Monitoramento contínuo de Frequência Cardíaca (`bpm`), Pressão Arterial (`mmHg`), Oxigenação (`SpO₂`), Glicose (`mg/dL`), Cetonas, Cortisol Salivar e Nutrição por ambiente (`nave`, `estacao`, `lua_base`, `lua_rover`, `marte_base`, `marte_rover`).
* 🚨 **Triggers Automáticos de Anomalia:** Gatilho SQL (`verificar_anomalia_vital`) que analisa cada leitura inserida e dispara alerta crítico automaticamente quando `SpO₂ < 95%`, `FC > 110 bpm`, `FC < 50 bpm` ou `PA > 180 mmHg`.
* 🩺 **Exames de Imagem & Prontuário Médico:** Upload de ultrassom venoso e OCT de retina para bucket privado (`exames-imagem`), com acesso restrito ao oficial médico (`eh_medico()`) para laudo e emissão de parecer clínico.
* 👁️ **Prevenção SANS & Saúde Mental:** Acompanhamento diário de humor, estresse, adaptação gravitacional e contramedidas da Síndrome Neuro-Ocular Associada ao Voo Espacial (suplementação de Complexo B e uso de manguito de coxa).
* 🏆 **Gamificação Privada da Rotina:** Metas diárias de hidratação (`2.500 ml`), exercícios resistidos e sono com desbloqueio de conquistas individuais sem exposição competitiva entre tripulantes.

---
## 🏗️ Arquitetura do Sistema

```mermaid
flowchart LR
    A[👩‍🚀 Astronauta / 👨‍⚕️ Médico] --> B[🌐 Front-end Web\nFirebase Hosting]
    A --> C[🐍 CLI Back-end\nASTROHEALTH-db.py]
    B & C --> D[(🗄️ PostgreSQL / Supabase\nAuth + Triggers + RLS)]
    D --> E[🗂️ Storage Privado\nBucket: exames-imagem]
```
---
## 📂 Estrutura do Repositório

```text
NASA/
├── app/                      # Aplicação Front-end Web (Aplicativo de monitoramento dos astronautas)
│   ├── assets/               # Recursos visuais, ícones e estilos da interface
│   ├── pages/                # Páginas e telas do painel biomédico
│   ├── tests/                # Testes automatizados (Playwright)
│   ├── tools/                # Utilitários e scripts auxiliares do front-end
│   ├── index.html            # Ponto de entrada da aplicação web
│   ├── package.json          # Dependências e scripts Node.js
│   ├── playwright.config.js  # Configuração da suíte de testes E2E
│   └── sw.js                 # Service Worker (suporte offline-first para missões espaciais)
├── db/
│   └── schema.sql            # DDL completo: tabelas, triggers, função eh_medico(), RLS e Storage
├── ASTROHEALTH-db.py         # Back-end Python integrado ao Supabase (Painel Astronauta & Médico)
├── requirements.txt          # Dependências Python (supabase, python-dotenv)
├── .env.example              # Modelo de variáveis de ambiente para configuração local
├── .gitignore                # Proteção contra versionamento de credenciais (.env)
├── .gitattributes            # Configuração de atributos e normalização do Git
├── LICENSE                   # Licença MIT do projeto
└── README.md                 # Documentação oficial do projeto
```
---
## 🚀 Como Executar o Projeto

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone 
   [https://github.com/seu-usuario/astrohealth.git](https://github.com/seu-usuario/astrohealth.git)
   cd astrohealth
2. Instale as dependências do Front-end:
    ```bash
    cd frontend
    npm install
3. Execute o projeto em ambiente local:
    ```bash
    # No terminal do backend
    python main.py

    # No terminal do frontend
    npm run dev
    ```
4. Acesse a aplicação no seu navegador: https://spaceapps2026-infinitygirls.web.app/

--- 
### 🤝 Como Contribuir

Contribuições são bem-vindas! Se você deseja propor melhorias:

1. Faça um Fork do projeto.

2. Crie uma Branch para sua funcionalidade (git checkout -b feature/nova-funcionalidade).

3. Abra um Pull Request.

---
## 👩‍🚀 Equipe Infinity Girls

| Avatar | Nome | Função / Especialidade | Redes & Contato |
| :---: | :--- | :--- | :---: |
| <img src="https://github.com/elisasoares0.png" width="80" style="border-radius:50%;"> | **Elisa Soares** | Data Engineer | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat&logo=github&logoColor=white)](https://github.com/elisaosoares0) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/elisasoarestech) |
| <img src="https://github.com/jennyttavares-dotcom.png" width="80" style="border-radius:50%;"> | **Jeniffer Tavares** | Ajustar | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat&logo=github&logoColor=white)](https://github.com/jennyttavares-dotcom) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/jeniffer-tavares-2a0852a6/i/) |
| <img src="https://github.com/laramour.png" width="80" style="border-radius:50%;"> | **Lara Moura** | Ajustar | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat&logo=github&logoColor=white)](https://github.com/laramour) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/laranogueirabsi/) |
| <img src="https://github.com/Rafa-Protasio.png" width="80" style="border-radius:50%;"> | **Rafaela Protasio** | QA Enginner | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat&logo=github&logoColor=white)](https://github.com/elisaosoares0) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/rafaela-protasio) |
| <img src="https://github.com/itstfs.png" width="80" style="border-radius:50%;"> | **Thaiza Favarelli** | Frontend Developer & Ergonomics | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat&logo=github&logoColor=white)](https://github.com/itstfs) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/thaiza-favarelli-da-silva/) |
| <img src="https://github.com/yaabdon.png" width="80" style="border-radius:50%;"> | **Yasmin Abdon** | Ajustar | [![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat&logo=github&logoColor=white)](https://github.com/yaabdon) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/yasminabdon) |

---
## 📄 Licença
Este projeto é desenvolvido sob a licença MIT — consulte o arquivo LICENSE para mais detalhes.

