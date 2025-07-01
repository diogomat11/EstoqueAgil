-- Adiciona a coluna 'tipo' na tabela requisicao para classificar a natureza da requisição
ALTER TABLE public.requisicao
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(30);

-- Atribui valor padrão aos registros existentes
UPDATE public.requisicao
    SET tipo = 'COMPRA'
    WHERE tipo IS NULL;

-- Define valor padrão para novos registros
ALTER TABLE public.requisicao
    ALTER COLUMN tipo SET DEFAULT 'COMPRA';

-- Documentação da coluna
COMMENT ON COLUMN public.requisicao.tipo IS 'Classificação da requisição (ex.: COMPRA, SERVICO)'; 