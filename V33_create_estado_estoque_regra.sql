-- V33_create_estado_estoque_regra.sql
-- Cria tabela parametrizável para regras de classificação do estado de estoque

CREATE TABLE IF NOT EXISTS public.estado_estoque_regra (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(30) UNIQUE NOT NULL,
    ordem_exibicao  INT          NOT NULL,
    estoque_minimo  BOOLEAN      NOT NULL,
    cobertura_min   NUMERIC,
    cobertura_max   NUMERIC,
    ativo           BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE  public.estado_estoque_regra IS 'Parâmetros dinâmicos para classificação de itens por estado de estoque.';
COMMENT ON COLUMN public.estado_estoque_regra.nome           IS 'Rótulo exibido (ex.: CRITICO, ABAIXO, NORMAL, INFLADO).';
COMMENT ON COLUMN public.estado_estoque_regra.ordem_exibicao IS 'Ordenação de severidade (1 = mais crítico).';
COMMENT ON COLUMN public.estado_estoque_regra.estoque_minimo IS 'Se TRUE, aplica quando o estoque atual é menor ou igual ao mínimo.';
COMMENT ON COLUMN public.estado_estoque_regra.cobertura_min  IS 'Cobertura mínima em dias para que a regra seja aplicada.';
COMMENT ON COLUMN public.estado_estoque_regra.cobertura_max  IS 'Cobertura máxima em dias para que a regra seja aplicada.';
COMMENT ON COLUMN public.estado_estoque_regra.ativo          IS 'Permite ativar ou desativar a regra sem removê-la.';

-- Seed inicial de regras padrão
INSERT INTO public.estado_estoque_regra 
      (nome,     ordem_exibicao, estoque_minimo, cobertura_min, cobertura_max)
VALUES
('CRITICO', 1, TRUE , NULL,  5),
('ABAIXO' , 2, FALSE, NULL, 30),
('NORMAL' , 3, FALSE, 30,  30),
('INFLADO', 4, FALSE, 30,  NULL)
ON CONFLICT (nome) DO NOTHING; 