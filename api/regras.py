"""
Regras de negócio sem dependências externas (dá para testar sem instalar nada).

As regras de identificação copiam exatamente as do front (app/assets/js/accounts.js),
para o banco e a tela aceitarem as mesmas coisas.

As mensagens que vão para a pessoa ficam em inglês porque o app inteiro é em inglês.
"""
import re
from datetime import date

_AST = re.compile(r"^AST[\s-]?(\d{3,6})$")
_CRM = re.compile(r"^CRM[\s-]?(?:([A-Z]{2})[\s-]?)?(\d{4,7})(?:\s?/\s?([A-Z]{2}))?$")


def email_interno(id_number):
    """
    O Supabase Auth exige e-mail. Cada ID vira um e-mail interno que ninguém digita.
    Mesma regra do SGBD/ASTROHEALTH-db.py da Elisa (nasa_id_para_email_interno),
    para contas criadas pelo script e pela API serem as mesmas:
        "AST-1234"      -> "ast_1234@astrohealth.nasa"
        "CRM-SP 123456" -> "crm_sp_123456@astrohealth.nasa"
    """
    limpo = re.sub(r"[^a-z0-9]", "_", str(id_number or "").lower())
    return f"{limpo}@astrohealth.nasa"


def identificar(valor):
    """
    "ast 1234"      -> ("astronaut", "AST-1234")
    "crm sp 123456" -> ("doctor", "CRM-SP 123456")
    "CRM 123456/SP" -> ("doctor", "CRM-SP 123456")
    inválido        -> None
    """
    texto = re.sub(r"\s+", " ", str(valor or "").strip().upper())
    ast = _AST.match(texto)
    if ast:
        return "astronaut", "AST-" + ast.group(1)
    crm = _CRM.match(texto)
    if crm:
        uf = crm.group(1) or crm.group(3)
        return "doctor", "CRM" + ("-" + uf if uf else "") + " " + crm.group(2)
    return None


PERFIL_POR_PAPEL = {"astronaut": "paciente", "doctor": "medico"}
PAPEL_POR_PERFIL = {v: k for k, v in PERFIL_POR_PAPEL.items()}


def senha_valida(senha):
    senha = str(senha or "")
    return len(senha) >= 8 and re.search(r"[a-z]", senha, re.I) is not None and re.search(r"\d", senha) is not None


def idade(nascimento, hoje=None):
    hoje = hoje or date.today()
    anos = hoje.year - nascimento.year
    if (hoje.month, hoje.day) < (nascimento.month, nascimento.day):
        anos -= 1
    return anos


def validar_cadastro(dados, hoje=None):
    """
    Mesmas checagens do cadastro do front. Devolve {campo: mensagem}; vazio = tudo certo.
    `dados` usa os nomes de campo do front: name, password, idNumber, sex, birthDate (date).
    O login é pelo próprio ID (AST-/CRM), como no schema.sql da Elisa.
    """
    erros = {}
    if len(str(dados.get("name") or "").strip()) < 2:
        erros["name"] = "Enter your full name."
    if not senha_valida(dados.get("password")):
        erros["password"] = "Use at least 8 characters, with letters and numbers."
    quem = identificar(dados.get("idNumber"))
    if not quem:
        erros["idNumber"] = "Enter an astronaut ID like AST-1234 or a medical license (CRM) like CRM-SP 123456."
    if quem and quem[0] == "astronaut" and dados.get("sex") not in ("Female", "Male"):
        erros["sex"] = "Choose your sex: it turns on the matching health module."
    nascimento = dados.get("birthDate")
    if nascimento is None:
        erros["birthDate"] = "Enter your date of birth."
    elif not 18 <= idade(nascimento, hoje) <= 80:
        erros["birthDate"] = "Check the date: crew members are between 18 and 80 years old."
    return erros


# ---------------------------------------------------------------------------
# Rótulos em texto (acessibilidade: status nunca só por cor, escala nunca só número)
# ---------------------------------------------------------------------------

STATUS_ALERTA = {
    "normal": {"label": "Normal", "level": "ok"},
    "atencao": {"label": "Attention", "level": "warning"},
    "alerta": {"label": "Critical alert", "level": "danger"},
}

STATUS_LEITURA = {
    "pendente": {"label": "Waiting for the medical officer", "level": "pending"},
    "normal": {"label": "Normal", "level": "ok"},
    "atencao": {"label": "Attention", "level": "warning"},
    "critico": {"label": "Critical", "level": "danger"},
}

ESCALA_HUMOR = {1: "Very low", 2: "Low", 3: "Okay", 4: "Good", 5: "Great"}
ESCALA_ESTRESSE = {1: "Calm", 2: "Mild", 3: "Moderate", 4: "High", 5: "Extreme"}
ESCALA_DOR = {1: "Very mild", 2: "Mild", 3: "Moderate", 4: "Strong", 5: "Worst"}
ESCALA_ENJOO = {0: "None", 1: "Very mild", 2: "Mild", 3: "Moderate", 4: "Strong", 5: "Intense"}

UNIDADES = {
    "frequencia_cardiaca_bpm": "bpm",
    "pressao_sistolica_mmhg": "mmHg",
    "pressao_diastolica_mmhg": "mmHg",
    "pressao_arterial_mmhg": "mmHg",
    "oxigenacao_spo2": "%",
    "glicose_mg_dl": "mg/dL",
    "cetonas_mmol": "mmol/L",
    "cortisol_saliva_ng": "ng/mL",
    "hidratacao_atual_ml": "mL",
    "meta_hidratacao_ml": "mL",
    "temperatura_celsius": "°C",
    "horas_sono": "h",
    "calorias_kcal": "kcal",
    "proteina_g": "g",
    "vitamina_d_ui": "IU",
    "calcio_mg": "mg",
}


def rotulo_status(tabela, valor):
    """{"value": "alerta", "label": "Critical alert", "level": "danger"}; valor desconhecido vira o próprio texto."""
    if valor is None:
        return None
    info = tabela.get(valor, {"label": str(valor), "level": "unknown"})
    return {"value": valor, **info}


def rotulo_escala(escala, valor, maximo):
    """4 -> {"value": 4, "max": 5, "label": "Good", "text": "4 of 5: Good"}"""
    if valor is None:
        return None
    nome = escala.get(valor, str(valor))
    return {"value": valor, "max": maximo, "label": nome, "text": f"{valor} of {maximo}: {nome}"}
