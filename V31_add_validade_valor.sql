-- Migration V31: adiciona coluna validade_valor a item_estoque
-- Guarda a data de validade do preço atual

ALTER TABLE public.item_estoque
    ADD COLUMN IF NOT EXISTS validade_valor TIMESTAMPTZ;

COMMENT ON COLUMN public.item_estoque.validade_valor IS 'Validade do valor unitário registrado para o item.'; 