-- V13: Cria a tabela para auditoria de divergências e ajusta status de orçamentos.

-- 1. Cria a tabela para registrar as divergências encontradas na entrada de estoque.
CREATE TABLE auditoria_divergencia (
    id SERIAL PRIMARY KEY,
    movimentacao_item_id INTEGER NOT NULL REFERENCES movimentacao_estoque_item(id),
    tipo_divergencia VARCHAR(50) NOT NULL, -- 'QUANTIDADE', 'VALOR', 'AMBOS'
    valor_esperado NUMERIC(10, 2) NOT NULL,
    valor_recebido NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE', 'APROVADA', 'REJEITADA'
    justificativa_conferencia TEXT,
    justificativa_auditoria TEXT,
    usuario_auditoria_id INTEGER REFERENCES usuario(id),
    data_auditoria TIMESTAMPTZ,
    data_criacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Adiciona um novo status na tabela de orçamento (pedidos) para indicar recebimento com problemas.
-- Primeiro, removemos a constraint antiga se ela existir para poder adicionar o novo valor.
ALTER TABLE orcamento
DROP CONSTRAINT IF EXISTS chk_orcamento_status;

-- Adicionamos a nova constraint com todos os valores permitidos, incluindo os que já existem no banco.
ALTER TABLE orcamento
ADD CONSTRAINT chk_orcamento_status CHECK (
    status IN (
        'PENDENTE', 'APROVADO', 'REPROVADO', 'CANCELADO', -- Status de Análise de Orçamento
        'AGUARDANDO_ENVIO', 'PEDIDO_REALIZADO', 'RECEBIDO', 'FINALIZADO', -- Status de Pedido de Compra
        'RECEBIDO_COM_DIVERGENCIA', -- Novo status de Pedido de Compra
        'APROVADO_TOTALMENTE', -- Status legado existente
        'AGUARDANDO_APROVACAO' -- Status legado existente
    )
);

COMMENT ON TABLE auditoria_divergencia IS 'Registra divergências entre o pedido de compra e a entrega física.';
COMMENT ON COLUMN auditoria_divergencia.tipo_divergencia IS 'Indica se a divergência foi na quantidade, no valor ou em ambos.';
COMMENT ON COLUMN auditoria_divergencia.status IS 'Status do processo de auditoria da divergência.'; 