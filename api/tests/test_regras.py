"""
Testes das regras (não precisam de internet nem de pacotes):
    cd api && python -m unittest discover -s tests -v
"""
import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import regras  # noqa: E402


class Identificacao(unittest.TestCase):
    def test_astronauta_formatos_do_front(self):
        for entrada in ("AST-1234", "ast 1234", "AST1234", "  ast-0427 "):
            self.assertEqual(regras.identificar(entrada)[0], "astronaut", entrada)
        self.assertEqual(regras.identificar("ast 1234"), ("astronaut", "AST-1234"))

    def test_astronauta_limites_de_digitos(self):
        self.assertIsNotNone(regras.identificar("AST-123"))
        self.assertIsNotNone(regras.identificar("AST-123456"))
        self.assertIsNone(regras.identificar("AST-12"))
        self.assertIsNone(regras.identificar("AST-1234567"))

    def test_medico_formatos_do_front(self):
        self.assertEqual(regras.identificar("crm sp 123456"), ("doctor", "CRM-SP 123456"))
        self.assertEqual(regras.identificar("CRM 123456/SP"), ("doctor", "CRM-SP 123456"))
        self.assertEqual(regras.identificar("CRM-SP 123456"), ("doctor", "CRM-SP 123456"))
        self.assertEqual(regras.identificar("CRM 123456"), ("doctor", "CRM 123456"))

    def test_invalidos(self):
        for entrada in ("", None, "XYZ-1234", "1234", "CRM 123", "AST 12a4"):
            self.assertIsNone(regras.identificar(entrada), entrada)

    def test_formato_gravado_bate_com_o_check_do_banco(self):
        # mesmo CHECK de SGBD/ajustes_api.sql
        import re
        check = re.compile(r"^AST-[0-9]{3,6}$|^CRM(-[A-Z]{2})? [0-9]{4,7}$|^(AST|CRM)-[A-Z0-9]{2,15}$")
        for entrada in ("ast 1234", "crm sp 123456", "CRM 123456/SP", "CRM 1234567", "AST-0427"):
            gravado = regras.identificar(entrada)[1]
            self.assertTrue(check.match(gravado), gravado)


class EmailInterno(unittest.TestCase):
    def test_igual_ao_script_da_elisa(self):
        # SGBD/ASTROHEALTH-db.py: re.sub(r"[^a-z0-9]", "_", nasa_id.lower()) + "@astrohealth.nasa"
        self.assertEqual(regras.email_interno("AST-1234"), "ast_1234@astrohealth.nasa")
        self.assertEqual(regras.email_interno("CRM-SP 123456"), "crm_sp_123456@astrohealth.nasa")


class Cadastro(unittest.TestCase):
    HOJE = date(2026, 11, 14)
    BASE = {"name": "Helena Silva", "password": "Mission2026",
            "idNumber": "AST-0427", "sex": "Female", "birthDate": date(1985, 3, 14)}

    def test_cadastro_valido(self):
        self.assertEqual(regras.validar_cadastro(self.BASE, self.HOJE), {})

    def test_medico_nao_precisa_de_sexo(self):
        dados = {**self.BASE, "idNumber": "CRM-SP 123456", "sex": None}
        self.assertEqual(regras.validar_cadastro(dados, self.HOJE), {})

    def test_astronauta_precisa_de_sexo(self):
        dados = {**self.BASE, "sex": None}
        self.assertIn("sex", regras.validar_cadastro(dados, self.HOJE))

    def test_senha_fraca(self):
        for senha in ("curta1", "semnumeros", "12345678"):
            self.assertIn("password", regras.validar_cadastro({**self.BASE, "password": senha}, self.HOJE))

    def test_idade(self):
        menor = {**self.BASE, "birthDate": date(2010, 1, 1)}
        self.assertIn("birthDate", regras.validar_cadastro(menor, self.HOJE))
        # faz 18 exatamente hoje
        dezoito = {**self.BASE, "birthDate": date(2008, 11, 14)}
        self.assertNotIn("birthDate", regras.validar_cadastro(dezoito, self.HOJE))
        # faz 18 amanhã
        quase = {**self.BASE, "birthDate": date(2008, 11, 15)}
        self.assertIn("birthDate", regras.validar_cadastro(quase, self.HOJE))

    def test_varios_erros_de_uma_vez(self):
        erros = regras.validar_cadastro({"birthDate": None}, self.HOJE)
        self.assertEqual(set(erros), {"name", "password", "idNumber", "birthDate"})


class Rotulos(unittest.TestCase):
    def test_status_em_texto(self):
        self.assertEqual(regras.rotulo_status(regras.STATUS_ALERTA, "alerta"),
                         {"value": "alerta", "label": "Critical alert", "level": "danger"})
        self.assertEqual(regras.rotulo_status(regras.STATUS_ALERTA, "novo")["label"], "novo")
        self.assertIsNone(regras.rotulo_status(regras.STATUS_ALERTA, None))

    def test_escala(self):
        self.assertEqual(regras.rotulo_escala(regras.ESCALA_HUMOR, 4, 5)["text"], "4 of 5: Good")
        self.assertEqual(regras.rotulo_escala(regras.ESCALA_ENJOO, 0, 5)["label"], "None")
        self.assertEqual(regras.rotulo_escala(regras.ESCALA_DOR, 5, 5)["text"], "5 of 5: Worst")


if __name__ == "__main__":
    unittest.main()
