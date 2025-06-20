-- 1. Lidar com a dependência em item_estoque antes de dropar a tabela 'negociacoes'
-- A coluna 'negociacao_id' será recriada como 'orcamento_id' para manter a lógica de comodato.
-- Primeiro, removemos a constraint, se ela existir.
ALTER TABLE item_estoque DROP CONSTRAINT IF EXISTS item_estoque_negociacao_id_fkey;
-- Depois, removemos a coluna antiga, pois os dados nela são inválidos.
ALTER TABLE item_estoque DROP COLUMN IF EXISTS negociacao_id;


-- 2. Agora podemos remover a tabela de negociações com segurança
DROP TABLE IF EXISTS negociacoes;

-- 3. Remover a tabela antiga de orcamento_item se existir
DROP TABLE IF EXISTS orcamento_item;

-- 4. Adicionar colunas à tabela de orcamento para suportar o novo fluxo
ALTER TABLE orcamento ADD COLUMN IF NOT EXISTS requisicao_id INTEGER REFERENCES requisicao(id);
ALTER TABLE orcamento ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'ORCAMENTO'; -- 'ORCAMENTO' ou 'NEGOCIACAO'
ALTER TABLE orcamento ADD COLUMN IF NOT EXISTS validade_inicio TIMESTAMPTZ;
ALTER TABLE orcamento ADD COLUMN IF NOT EXISTS validade_fim TIMESTAMPTZ;
ALTER TABLE orcamento ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'EM_ELABORACAO';
-- Status possíveis: EM_ELABORACAO, AGUARDANDO_APROVACAO, APROVADO, REPROVADO, ADQUIRIDO, VENCIDO

-- 5. Criar uma nova tabela para armazenar as cotações detalhadas por fornecedor e item
CREATE TABLE IF NOT EXISTS orcamento_cotacao (
    id SERIAL PRIMARY KEY,
    orcamento_id INTEGER NOT NULL REFERENCES orcamento(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES item_estoque(id),
    fornecedor_id INTEGER NOT NULL REFERENCES fornecedor(id),
    valor_unitario NUMERIC(10, 2) NOT NULL,
    selecionado BOOLEAN DEFAULT false -- Indica se esta cotação foi a escolhida para o item
);

COMMENT ON TABLE orcamento_cotacao IS 'Armazena os preços cotados de cada item por cada fornecedor para um determinado orçamento.';

-- 6. Adicionar a nova coluna 'orcamento_id' em item_estoque para apontar para uma negociação aprovada (que agora é um orçamento)
ALTER TABLE item_estoque ADD COLUMN IF NOT EXISTS orcamento_id INTEGER REFERENCES orcamento(id);
COMMENT ON COLUMN item_estoque.orcamento_id IS 'Referência a um orçamento do tipo NEGOCIACAO que define o preço/fornecedor para itens de comodato.'; 