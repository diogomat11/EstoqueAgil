-- Cria a tabela principal para registrar cada movimentação de estoque (entrada ou saída).
CREATE TABLE IF NOT EXISTS public.movimentacao_estoque (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO')),
    data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'CONCLUIDA', -- CONCLUIDA, PENDENTE_AUDITORIA, CANCELADA
    usuario_id INTEGER,
    pedido_compra_id INTEGER UNIQUE, -- Garante que uma entrada só pode ser feita uma vez por pedido
    observacao TEXT,

    CONSTRAINT fk_usuario
        FOREIGN KEY(usuario_id) 
        REFERENCES public.usuario(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_pedido_compra
        FOREIGN KEY(pedido_compra_id) 
        REFERENCES public.orcamento(id)
        ON DELETE SET NULL
);

COMMENT ON TABLE public.movimentacao_estoque IS 'Registra todas as entradas e saídas de itens do estoque.';
COMMENT ON COLUMN public.movimentacao_estoque.tipo IS 'Tipo da movimentação: ENTRADA, SAIDA, etc.';
COMMENT ON COLUMN public.movimentacao_estoque.pedido_compra_id IS 'Link para o Pedido de Compra que originou a entrada (se aplicável).';

-- Cria a tabela para os itens específicos de cada movimentação.
CREATE TABLE IF NOT EXISTS public.movimentacao_estoque_item (
    id SERIAL PRIMARY KEY,
    movimentacao_id INTEGER NOT NULL,
    item_estoque_id INTEGER NOT NULL,
    quantidade_movimentada NUMERIC(10, 2) NOT NULL,
    valor_unitario_na_movimentacao NUMERIC(10, 2),

    CONSTRAINT fk_movimentacao
        FOREIGN KEY(movimentacao_id) 
        REFERENCES public.movimentacao_estoque(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_item_estoque
        FOREIGN KEY(item_estoque_id) 
        REFERENCES public.item_estoque(id)
        ON DELETE RESTRICT
);

COMMENT ON TABLE public.movimentacao_estoque_item IS 'Detalha os itens e quantidades de cada movimentação de estoque.'; 