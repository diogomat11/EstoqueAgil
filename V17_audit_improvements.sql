-- V17: Melhorias no fluxo de auditoria de estoque

-- 1. Adiciona um novo status para a tabela principal de movimentação,
-- indicando que ela foi processada, mas ainda tem itens pendentes.
ALTER TABLE movimentacao_estoque
DROP CONSTRAINT IF EXISTS chk_movimentacao_status,
ADD CONSTRAINT chk_movimentacao_status CHECK (status IN (
    'CONCLUIDA', 
    'PENDENTE_AUDITORIA', 
    'CANCELADA', 
    'CONCLUIDA_PARCIALMENTE' -- Novo status
));


-- 2. Adiciona uma coluna de status para cada ITEM da movimentação.
-- Isso permite que itens sem divergência entrem no estoque imediatamente,
-- enquanto outros aguardam auditoria na mesma movimentação.
ALTER TABLE movimentacao_estoque_item
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'CONCLUIDO'; -- Padrões: CONCLUIDO, PENDENTE_AUDITORIA

ALTER TABLE movimentacao_estoque_item
DROP CONSTRAINT IF EXISTS chk_movimentacao_item_status,
ADD CONSTRAINT chk_movimentacao_item_status CHECK (status IN ('CONCLUIDO', 'PENDENTE_AUDITORIA'));

COMMENT ON COLUMN movimentacao_estoque_item.status IS 'Status do item individual dentro da movimentação.'; 