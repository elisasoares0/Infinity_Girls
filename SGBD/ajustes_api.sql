-- =====================================================================
-- AstroHealth: ajustes no schema.sql para a API e o front
-- Rodar no SQL Editor do Supabase DEPOIS do schema.sql.
--
-- Só acrescenta colunas e corrige duas regras. Não apaga dados e não mexe
-- em chave primária. Pode rodar mais de uma vez.
-- =====================================================================


-- 1. Formato do ID igual ao do front ------------------------------------
-- O CHECK atual (^(AST|CRM)-[A-Z0-9]{2,15}$) recusa o CRM que o front grava:
--   "CRM-SP 123456" (tem espaço) e "CRM 123456" (sem UF, sem hífen).
-- Médico com CRM não conseguia se cadastrar. O novo CHECK aceita o formato do
-- front e continua aceitando o formato antigo, para não quebrar contas existentes.

ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_nasa_id_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_nasa_id_check CHECK (
       nasa_id ~ '^AST-[0-9]{3,6}$'                 -- AST-1234 (front)
    OR nasa_id ~ '^CRM(-[A-Z]{2})? [0-9]{4,7}$'     -- CRM-SP 123456 ou CRM 123456 (front)
    OR nasa_id ~ '^(AST|CRM)-[A-Z0-9]{2,15}$'       -- formato antigo do schema.sql
);


-- 2. Colunas que faltavam ---------------------------------------------

-- Sexo: o front usa para abrir o módulo de saúde feminina ou masculina
ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS sexo VARCHAR(10) CHECK (sexo IS NULL OR sexo IN ('Female', 'Male'));

-- Pressão em dois números. pressao_arterial_mmhg continua (o trigger de alerta usa):
-- a API grava a sistólica nela.
ALTER TABLE public.sinais_vitais
    ADD COLUMN IF NOT EXISTS pressao_sistolica_mmhg  NUMERIC(5,1) CHECK (pressao_sistolica_mmhg  BETWEEN 50 AND 260),
    ADD COLUMN IF NOT EXISTS pressao_diastolica_mmhg NUMERIC(5,1) CHECK (pressao_diastolica_mmhg BETWEEN 30 AND 160);

-- Texto alternativo da imagem (acessibilidade: vira o alt no front)
ALTER TABLE public.exames_imagem
    ADD COLUMN IF NOT EXISTS descricao_imagem TEXT;


-- 3. Cadastro: perfil e dados que o trigger não copiava ------------------
-- Correções no handle_new_user:
--   * "CRM 123456" (sem hífen) virava paciente, porque o teste era LIKE 'CRM-%';
--   * data_nascimento era enviada no cadastro, mas não era gravada;
--   * sexo passa a ser gravado.
-- O resto é igual ao do schema.sql.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nasa_id TEXT;
    v_perfil  TEXT;
BEGIN
    v_nasa_id := UPPER(TRIM(NEW.raw_user_meta_data->>'nasa_id'));

    IF v_nasa_id LIKE 'CRM%' THEN
        v_perfil := 'medico';
    ELSE
        v_perfil := 'paciente';
    END IF;

    INSERT INTO public.usuarios (id, nasa_id, nome, perfil, missao, tipo_sanguineo, cpf, data_nascimento, sexo)
    VALUES (
        NEW.id,
        v_nasa_id,
        COALESCE(NEW.raw_user_meta_data->>'nome', 'Tripulante'),
        v_perfil,
        COALESCE(NEW.raw_user_meta_data->>'missao', 'Artemis IV'),
        COALESCE(NEW.raw_user_meta_data->>'tipo_sanguineo', 'N/I'),
        NULLIF(NEW.raw_user_meta_data->>'cpf', ''),
        NULLIF(NEW.raw_user_meta_data->>'data_nascimento', '')::date,
        NULLIF(NEW.raw_user_meta_data->>'sexo', '')
    );

    RETURN NEW;
END;
$$;
