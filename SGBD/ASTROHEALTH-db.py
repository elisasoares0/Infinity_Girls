import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

pasta_atual = Path(__file__).resolve().parent
env_path = pasta_atual / ".env" if (pasta_atual / ".env").exists() else pasta_atual.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")
SUPABASE_KEY = (os.getenv("SUPABASE_KEY") or "").strip()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def cadastrar_paciente():
    print("\n--- CADASTRO DE ASTRONAUTA / PACIENTE ---")
    email = input("E-mail: ").strip()
    senha = input("Senha (mínimo 6 caracteres): ").strip()
    cpf = input("CPF (11 números): ").strip()
    nome = input("Nome completo: ").strip()
    tipo_sanguineo = input("Tipo Sanguíneo (ex: O+): ").strip().upper() or "N/I"

    try:
        # Cria o usuário no Supabase Auth; o trigger SQL cria a linha na tabela 'usuarios' automaticamente
        res = supabase.auth.sign_up({
            "email": email,
            "password": senha,
            "options": {
                "data": {
                    "cpf": cpf,
                    "nome": nome,
                    "missao": "Artemis IV",
                    "tipo_sanguineo": tipo_sanguineo
                }
            }
        })
        print(f"✅ Cadastro realizado! UID gerado: {res.user.id}")
    except Exception as e:
        print(f"❌ Erro no cadastro: {e}")


def entrar_e_testar():
    print("\n--- LOGIN NO ASTROHEALTH ---")
    email = input("E-mail: ").strip()
    senha = input("Senha: ").strip()

    try:
        auth_res = supabase.auth.sign_in_with_password({"email": email, "password": senha})
        user_id = auth_res.user.id

        # Busca o perfil respeitando o RLS
        perfil = supabase.table("usuarios").select("*").eq("id", user_id).single().execute().data
        print(f"\n🟢 Bem-vindo(a), {perfil['nome']} | Perfil: {perfil['perfil'].upper()}")

        if perfil["perfil"] == "paciente":
            painel_paciente(user_id, perfil["nome"])
        elif perfil["perfil"] == "medico":
            painel_medico(user_id, perfil["nome"])
    except Exception as e:
        print(f"❌ Falha no login: {e}")


def painel_paciente(user_id, nome):
    while True:
        print(f"\n=== PAINEL ASTRONAUTA: {nome} ===")
        print("1. Registrar Sinais Vitais, Glicose (mg/dL) e Ambiente")
        print("2. Enviar Imagem de Ultrassom / Exame (Upload Storage)")
        print("3. Check-in Diário: Humor, Estresse, Gravidade e SANS")
        print("4. Gamificação e Metas Diárias (Água, Exercício, Sono)")
        print("5. Consultar Meu Histórico e Pareceres Médicos")
        print("6. Sair (Logout)")
        op = input("Opção: ").strip()

        if op == "1":
            print("\n--- TELEMETRIA, GLICOSE E EXAMES ---")
            ambiente = input("Ambiente (nave / estacao / lua_base / lua_rover / marte_base / marte_rover) [estacao]: ").strip() or "estacao"
            fc = int(input("Frequência Cardíaca (bpm): "))
            pa = float(input("Pressão Arterial (mmHg): "))
            spo2 = float(input("Oxigenação SpO2 (%): "))
            glicose = float(input("Glicose (mg/dL): "))
            cetonas = input("Cetonas (mmol/L) [Enter para pular]: ").strip()
            imune = input("Status Imune Saliva (normal / elevado / baixo) [normal]: ").strip() or "normal"

            payload = {
                "usuario_id": user_id,
                "ambiente_missao": ambiente,
                "frequencia_cardiaca_bpm": fc,
                "pressao_arterial_mmhg": pa,
                "oxigenacao_spo2": spo2,
                "glicose_mg_dl": glicose,
                "marcador_imune_status": imune
            }
            
            if cetonas:
                payload["cetonas_mmol"] = float(cetonas)

            dado = supabase.table("sinais_vitais").insert(payload).execute().data[0]
            if dado["status_alerta"] == "alerta":
                print("🔴 ALERTA CRÍTICO (NASA RED) DISPARADO PELO BANCO!")
            else:
                print("🩵 Sinais vitais salvos em estado NORMAL.")

        elif op == "2":
            print("\n--- UPLOAD DE EXAME DE ULTRASSOM ---")
            caminho_local = input("Caminho completo da imagem no PC (ex: C:\\exames\\pescoco.jpg): ").strip().strip('"')
            regiao = input("Região examinada (ex: Veia Jugular / Retina): ").strip() or "Veia Jugular"
            obs = input("Observação do astronauta: ").strip()

            if not os.path.exists(caminho_local):
                print("❌ Arquivo não encontrado no caminho informado.")
                continue

            try:
                extensao = os.path.splitext(caminho_local)[1] or ".jpg"
                nome_arquivo_storage = f"{user_id}/ultrassom_{int(time.time())}{extensao}"

                with open(caminho_local, "rb") as f:
                    supabase.storage.from_("exames-imagem").upload(
                        path=nome_arquivo_storage,
                        file=f,
                        file_options={"content-type": "image/jpeg"}
                    )

                supabase.table("exames_imagem").insert({
                    "usuario_id": user_id,
                    "tipo_exame": "ultrassom_venoso",
                    "regiao_anatomica": regiao,
                    "imagem_url": nome_arquivo_storage,
                    "observacao_astronauta": obs
                }).execute()

                print("✅ Ultrassom enviado ao Storage e registrado para avaliação médica!")
            except Exception as e:
                print(f"❌ Erro ao enviar imagem: {e}")

        elif op == "3":
            print("\n--- AVALIAÇÃO DIÁRIA (HUMOR, GRAVIDADE E SANS) ---")
            humor = int(input("Escala de Humor (1=Muito baixo a 5=Ótimo): "))
            estresse = int(input("Escala de Estresse (1=Calmo a 5=Extremo): "))
            enjoo = int(input("Enjoo por troca de gravidade (0=Nenhum a 5=Intenso): "))
            visao_turva = input("Visão turva de perto hoje? (s/n): ").strip().lower() == "s"
            complexo_b = input("Tomou suplemento Complexo B (prevenção SANS)? (s/n): ").strip().lower() == "s"
            manguito = input("Usou manguito de coxa (Thigh Cuff)? (s/n): ").strip().lower() == "s"

            supabase.table("avaliacoes_diarias").upsert({
                "usuario_id": user_id,
                "data_registro": str(date.today()),
                "humor_escala": humor,
                "estresse_escala": estresse,
                "enjoo_gravidade_escala": enjoo,
                "sans_visao_turva": visao_turva,
                "sans_complexo_b_tomado": complexo_b,
                "sans_manguito_coxa_usado": manguito
            }, on_conflict="usuario_id,data_registro").execute()
            print("✅ Check-in diário registrado com sucesso!")

        elif op == "4":
            print("\n--- METAS DIÁRIAS E GAMIFICAÇÃO ---")
            agua = int(input("Hidratação acumulada hoje (ml, ex: 2000): "))
            exercicio = input("Concluiu o exercício resistido hoje? (s/n): ").strip().lower() == "s"
            sono = input("Atingiu a meta de sono? (s/n): ").strip().lower() == "s"

            conquistas = []
            if agua >= 2500:
                conquistas.append("Hidratação Ótima")
            if exercicio and sono:
                conquistas.append("Rotina Espacial Completa")

            supabase.table("gamificacao_metas").upsert({
                "usuario_id": user_id,
                "data_registro": str(date.today()),
                "hidratacao_atual_ml": agua,
                "exercicio_concluido": exercicio,
                "sono_meta_atingida": sono,
                "checkin_realizado": True,
                "conquistas_desbloqueadas": conquistas
            }, on_conflict="usuario_id,data_registro").execute()
            print(f"✅ Metas atualizadas! Conquistas hoje: {conquistas or 'Em progresso'}")

        elif op == "5":
            vitais = supabase.table("sinais_vitais").select("*").eq("usuario_id", user_id).order("registrado_em", desc=True).limit(3).execute().data
            print("\n📊 Últimos Sinais Vitais:", vitais)

            imagens = supabase.table("exames_imagem").select("id, regiao_anatomica, status_leitura, parecer_medico").eq("usuario_id", user_id).execute().data
            print("🩺 Exames de Imagem:", imagens)

            prontuarios = supabase.table("prontuarios_medicos").select("*").eq("paciente_id", user_id).execute().data
            print("📋 Prontuário Médico:", prontuarios)

        elif op == "6":
            supabase.auth.sign_out()
            print("Sessão encerrada.")
            break

def painel_medico(medico_id, nome):
    while True:
        print(f"\n=== PAINEL MÉDICO: {nome} ===")
        print("1. Listar Todos os Astronautas")
        print("2. Avaliar Exames de Ultrassom Pendentes")
        print("3. Escrever Prontuário Clínico")
        print("4. Sair (Logout)")
        op = input("Opção (1-4): ").strip()

        if op == "1":
            pacientes = supabase.table("usuarios").select("id, nome, cpf, tipo_sanguineo, missao").eq("perfil", "paciente").execute().data
            for p in pacientes:
                print(f"• {p['nome']} | CPF: {p['cpf']} | UID: {p['id']}")

        elif op == "2":
            pendentes = supabase.table("exames_imagem").select("*").eq("status_leitura", "pendente").execute().data
            if not pendentes:
                print("Nenhum ultrassom pendente de leitura.")
                continue

            for ex in pendentes:
                # Gera link temporário seguro (válido por 10 min) para o médico abrir a imagem
                link_temp = supabase.storage.from_("exames-imagem").create_signed_url(ex["imagem_url"], 600)
                print(f"\nID Exame: {ex['id']} | Região: {ex['regiao_anatomica']} | Obs: {ex['observacao_astronauta']}")
                print(f"🔗 Link seguro da imagem: {link_temp.get('signedURL')}")

            exame_id = input("\nDigite o ID do exame para avaliar (ou Enter para voltar): ").strip()
            if exame_id:
                status = input("Classificação (normal / atencao / critico): ").strip()
                parecer = input("Parecer médico: ").strip()
                supabase.table("exames_imagem").update({
                    "status_leitura": status,
                    "parecer_medico": parecer,
                    "avaliado_por": medico_id
                }).eq("id", int(exame_id)).execute()
                print("✅ Parecer do ultrassom salvo!")

        elif op == "3":
            paciente_id = input("Cole o UID do paciente: ").strip()
            obs = input("Observação clínica: ").strip()
            diag = input("Diagnóstico resumido: ").strip()
            supabase.table("prontuarios_medicos").insert({
                "paciente_id": paciente_id,
                "medico_id": medico_id,
                "observacao_clinica": obs,
                "diagnostico": diag
            }).execute()
            print("✅ Prontuário salvo com sucesso!")


        elif op == "4":
            supabase.auth.sign_out()
            print("Sessão médica encerrada.")
            break


if __name__ == "__main__":
    while True:
        print("\n=== ASTROHEALTH — SUPABASE AUTH + RLS ===")
        print("1. Cadastrar Novo Paciente")
        print("2. Entrar (Astronauta ou Médico)")
        print("3. Encerrar")
        escolha = input("Escolha: ").strip()
        if escolha == "1":
            cadastrar_paciente()
        elif escolha == "2":
            entrar_e_testar()
        elif escolha == "3":
            break