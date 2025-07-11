-- V29: Renomeia coluna estoque_min para estoque_minimo em item_estoque

ALTER TABLE IF EXISTS public.item_estoque
    RENAME COLUMN estoque_min TO estoque_minimo;

-- Comentário opcional
COMMENT ON COLUMN public.item_estoque.estoque_minimo IS 'Quantidade mínima de estoque antes de gerar alertas.'; 