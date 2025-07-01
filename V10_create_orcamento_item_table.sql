-- Cria a tabela para armazenar os itens de um orçamento, seja ele uma análise ou um pedido de compra final.
CREATE TABLE IF NOT EXISTS public.orcamento_item (
    id SERIAL PRIMARY KEY,
    orcamento_id INTEGER NOT NULL,
    item_estoque_id INTEGER NOT NULL,
    quantidade NUMERIC(10, 2) NOT NULL,
    valor_unitario NUMERIC(10, 2),
    status VARCHAR(50) NOT NULL,
    
    CONSTRAINT fk_orcamento
        FOREIGN KEY(orcamento_id) 
        REFERENCES public.orcamento(id)
        ON DELETE CASCADE, -- Se o orçamento/pedido for deletado, seus itens também são.

    CONSTRAINT fk_item_estoque
        FOREIGN KEY(item_estoque_id) 
        REFERENCES public.item_estoque(id)
        ON DELETE RESTRICT -- Impede a exclusão de um item do estoque se ele estiver em um orçamento/pedido.
);

COMMENT ON TABLE public.orcamento_item IS 'Armazena os itens individuais de um orçamento ou de um pedido de compra.';
COMMENT ON COLUMN public.orcamento_item.orcamento_id IS 'ID do orçamento/pedido ao qual este item pertence.';
COMMENT ON COLUMN public.orcamento_item.item_estoque_id IS 'ID do item do estoque.';
COMMENT ON COLUMN public.orcamento_item.valor_unitario IS 'Valor unitário do item nesta cotação ou pedido.';
COMMENT ON COLUMN public.orcamento_item.status IS 'Status do item dentro do processo (ex: APROVADO, REPROVADO).'; 