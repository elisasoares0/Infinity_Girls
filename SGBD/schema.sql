-- ============================================================================
-- ASTROHEALTH (INFINITY GIRLS) — ESQUEMA COMPLETO DO BANCO DE DADOS (SUPABASE)
-- ============================================================================

-- 0. LIMPEZA (Permite recriar o banco do zero sem conflitos)
DROP TABLE IF EXISTS 
    public.gamificacao_metas,
    public.avaliacoes_diarias,
    public.exames_imagem,
    public.prontuarios_medicos,
    public.body_checkin,
    public.sinais_vitais,
    public.usuarios CASCADE;

DROP FUNCTION IF EXISTS public.verificar_anomalia_vital() CASCADE;
DROP FUNCTION IF EXISTS public.eh_medico() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================================
-- 1. TABELAS PRINCIPAIS
-- ============================================================================

-- 1.1 Usuários (Vinculado ao Supabase Auth, sem senha armazenada aqui)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cpf VARCHAR(11) UNIQUE NOT NULL CHECK (cpf ~ '^[0-9]{11}$'),
    nome VARCHAR(150) NOT NULL,
    perfil VARCHAR(20) NOT NULL DEFAULT 'paciente' CHECK (perfil IN ('paciente', 'medico')),
    crm VARCHAR(20) UNIQUE,
    missao VARCHAR(100) DEFAULT 'Artemis IV',
    tipo_sanguineo VARCHAR(5) DEFAULT 'N/I',
    data_nascimento DATE,
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Sinais Vitais, Telemetria, Exames Laboratoriais e Nutrição
CREATE TABLE public.sinais_vitais (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    ambiente_missao VARCHAR(30) DEFAULT 'estacao' 
        CHECK (ambiente_missao IN ('nave', 'estacao', 'lua_base', 'lua_rover', 'marte_base', 'marte_rover')),
    frequencia_cardiaca_bpm INTEGER NOT NULL CHECK (frequencia_cardiaca_bpm BETWEEN 20 AND 250),
    pressao_arterial_mmhg NUMERIC(5,1) NOT NULL CHECK (pressao_arterial_mmhg BETWEEN 40 AND 300),
    oxigenacao_spo2 NUMERIC(4,1) NOT NULL CHECK (oxigenacao_spo2 BETWEEN 50 AND 100),
    glicose_mg_dl NUMERIC(6,1) NOT NULL CHECK (glicose_mg_dl > 0),
    cetonas_mmol NUMERIC(4,2),
    cortisol_saliva_ng NUMERIC(5,2),
    marcador_imune_status VARCHAR(20) DEFAULT 'normal' 
        CHECK (marcador_imune_status IN ('normal', 'elevado', 'baixo')),
    calorias_kcal INTEGER,
    proteina_g NUMERIC(5,1),
    vitamina_d_ui INTEGER,
    calcio_mg INTEGER,
    temperatura_celsius NUMERIC(3,1) DEFAULT 36.6,
    horas_sono NUMERIC(3,1),
    status_alerta VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (status_alerta IN ('normal', 'alerta')),
    registrado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sinais_usuario_data ON public.sinais_vitais (usuario_id, registrado_em DESC);

-- 1.3 Body Check-in (Mapa Anatômico Interativo)
CREATE TABLE public.body_checkin (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    regiao_anatomica VARCHAR(50) NOT NULL,
    sintoma TEXT NOT NULL,
    intensidade INTEGER NOT NULL CHECK (intensidade BETWEEN 1 AND 5),
    protocolo_acao TEXT,
    resolvido BOOLEAN DEFAULT FALSE,
    registrado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checkin_usuario_data ON public.body_checkin (usuario_id, registrado_em DESC);

-- 1.4 Prontuários Médicos
CREATE TABLE public.prontuarios_medicos (
    id BIGSERIAL PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    medico_id UUID NOT NULL REFERENCES public.usuarios(id),
    observacao_clinica TEXT NOT NULL,
    diagnostico VARCHAR(200),
    registrado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prontuario_paciente ON public.prontuarios_medicos (paciente_id, registrado_em DESC);

-- 1.5 Exames de Imagem (Ultrassom Venoso / OCT Retina)
CREATE TABLE public.exames_imagem (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    tipo_exame VARCHAR(50) NOT NULL CHECK (tipo_exame IN ('ultrassom_venoso', 'oct_retina', 'outro')),
    regiao_anatomica VARCHAR(50) NOT NULL,
    imagem_url TEXT NOT NULL,
    observacao_astronauta TEXT,
    status_leitura VARCHAR(20) NOT NULL DEFAULT 'pendente' 
        CHECK (status_leitura IN ('pendente', 'normal', 'atencao', 'critico')),
    parecer_medico TEXT,
    avaliado_por UUID REFERENCES public.usuarios(id),
    registrado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exames_imagem_usuario ON public.exames_imagem (usuario_id, registrado_em DESC);

-- 1.6 Avaliações Diárias (Humor, Estresse, Gravidade e Prevenção SANS)
CREATE TABLE public.avaliacoes_diarias (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    humor_escala INTEGER CHECK (humor_escala BETWEEN 1 AND 5),
    estresse_escala INTEGER CHECK (estresse_escala BETWEEN 1 AND 5),
    enjoo_gravidade_escala INTEGER DEFAULT 0 CHECK (enjoo_gravidade_escala BETWEEN 0 AND 5),
    teste_equilibrio_aprovado BOOLEAN DEFAULT TRUE,
    sans_visao_turva BOOLEAN DEFAULT FALSE,
    sans_complexo_b_tomado BOOLEAN DEFAULT FALSE,
    sans_manguito_coxa_usado BOOLEAN DEFAULT FALSE,
    notas_privadas TEXT,
    registrado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE (usuario_id, data_registro)
);

-- 1.7 Gamificação e Metas Diárias Privadas
CREATE TABLE public.gamificacao_metas (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    meta_hidratacao_ml INTEGER DEFAULT 2500,
    hidratacao_atual_ml INTEGER DEFAULT 0,
    exercicio_concluido BOOLEAN DEFAULT FALSE,
    sono_meta_atingida BOOLEAN DEFAULT FALSE,
    checkin_realizado BOOLEAN DEFAULT FALSE,
    sequencia_dias INTEGER DEFAULT 0,
    conquistas_desbloqueadas TEXT[] DEFAULT '{}',
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE (usuario_id, data_registro)
);

-- ============================================================================
-- 2. FUNÇÕES E TRIGGERS AUTOMÁTICOS
-- ============================================================================

-- 2.1 Classifica automaticamente anomalias vitais (Alerta NASA Red)
CREATE OR REPLACE FUNCTION public.verificar_anomalia_vital()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.oxigenacao_spo2 < 95.0 
       OR NEW.frequencia_cardiaca_bpm > 110 
       OR NEW.frequencia_cardiaca_bpm < 50 
       OR NEW.pressao_arterial_mmhg > 180 THEN
        NEW.status_alerta := 'alerta';
    ELSE
        NEW.status_alerta := 'normal';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_classificar_sinais_vitais
BEFORE INSERT OR UPDATE ON public.sinais_vitais
FOR EACH ROW
EXECUTE FUNCTION public.verificar_anomalia_vital();

-- 2.2 Cria perfil automaticamente na tabela usuarios após cadastro no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.usuarios (id, cpf, nome, missao, tipo_sanguineo)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'cpf',
        NEW.raw_user_meta_data->>'nome',
        COALESCE(NEW.raw_user_meta_data->>'missao', 'Artemis IV'),
        COALESCE(NEW.raw_user_meta_data->>'tipo_sanguineo', 'N/I')
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 2.3 Função auxiliar para validar perfil médico nas políticas RLS
CREATE OR REPLACE FUNCTION public.eh_medico()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND perfil = 'medico');
$$;

-- ============================================================================
-- 3. SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ============================================================================

ALTER TABLE public.usuarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinais_vitais       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_checkin        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios_medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exames_imagem       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_diarias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamificacao_metas   ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON 
    public.usuarios,
    public.sinais_vitais,
    public.body_checkin,
    public.prontuarios_medicos,
    public.exames_imagem,
    public.avaliacoes_diarias,
    public.gamificacao_metas
FROM anon;

-- Políticas: usuarios
CREATE POLICY "ver perfil" ON public.usuarios
    FOR SELECT TO authenticated USING (auth.uid() = id OR public.eh_medico());

-- Políticas: sinais_vitais
CREATE POLICY "ver sinais" ON public.sinais_vitais
    FOR SELECT TO authenticated USING (auth.uid() = usuario_id OR public.eh_medico());
CREATE POLICY "inserir sinais" ON public.sinais_vitais
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- Políticas: body_checkin
CREATE POLICY "ver checkin" ON public.body_checkin
    FOR SELECT TO authenticated USING (auth.uid() = usuario_id OR public.eh_medico());
CREATE POLICY "inserir checkin" ON public.body_checkin
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "atualizar checkin" ON public.body_checkin
    FOR UPDATE TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- Políticas: prontuarios_medicos
CREATE POLICY "ver prontuario" ON public.prontuarios_medicos
    FOR SELECT TO authenticated USING (auth.uid() = paciente_id OR public.eh_medico());
CREATE POLICY "medico escreve prontuario" ON public.prontuarios_medicos
    FOR INSERT TO authenticated WITH CHECK (public.eh_medico() AND medico_id = auth.uid());

-- Políticas: exames_imagem
CREATE POLICY "ver exames imagem" ON public.exames_imagem
    FOR SELECT TO authenticated USING (auth.uid() = usuario_id OR public.eh_medico());
CREATE POLICY "inserir exames imagem" ON public.exames_imagem
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "medico avalia imagem" ON public.exames_imagem
    FOR UPDATE TO authenticated USING (public.eh_medico());

-- Políticas: avaliacoes_diarias
CREATE POLICY "gerenciar avaliacoes proprias" ON public.avaliacoes_diarias
    FOR ALL TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "medico ver avaliacoes" ON public.avaliacoes_diarias
    FOR SELECT TO authenticated USING (public.eh_medico());

-- Políticas: gamificacao_metas
CREATE POLICY "gerenciar gamificacao propria" ON public.gamificacao_metas
    FOR ALL TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- ============================================================================
-- 4. STORAGE BUCKET PRIVADO (IMAGENS DE ULTRASSOM / OCT)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('exames-imagem', 'exames-imagem', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Astronauta envia proprio exame" ON storage.objects;
CREATE POLICY "Astronauta envia proprio exame"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'exames-imagem' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Ver proprios exames ou acesso medico" ON storage.objects;
CREATE POLICY "Ver proprios exames ou acesso medico"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'exames-imagem' 
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.eh_medico())
);