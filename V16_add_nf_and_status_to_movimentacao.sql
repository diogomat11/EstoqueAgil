-- V16: Adiciona campos de Nota Fiscal e ajusta a tabela de movimentação de estoque.

-- 1. Adiciona colunas para armazenar informações da Nota Fiscal do fornecedor.
-- A coluna 'status' e 'observacao' já existem a partir da V12, então não são adicionadas aqui.
ALTER TABLE movimentacao_estoque
ADD COLUMN IF NOT EXISTS nf_numero VARCHAR(255),
ADD COLUMN IF NOT EXISTS nf_chave_acesso VARCHAR(255),
ADD COLUMN IF NOT EXISTS nf_data_emissao DATE;

-- 2. Adiciona uma constraint para os valores permitidos no status, caso ainda não exista.
-- Primeiro, remove a constraint antiga se o nome for conhecido e ela existir.
ALTER TABLE movimentacao_estoque DROP CONSTRAINT IF EXISTS chk_movimentacao_status;

-- Adiciona a nova constraint com os valores corretos.
ALTER TABLE movimentacao_estoque
ADD CONSTRAINT chk_movimentacao_status CHECK (status IN ('CONCLUIDA', 'PENDENTE_AUDITORIA', 'CANCELADA'));

COMMENT ON COLUMN movimentacao_estoque.nf_numero IS 'Número da Nota Fiscal do fornecedor.';
COMMENT ON COLUMN movimentacao_estoque.nf_chave_acesso IS 'Chave de acesso da NF-e do fornecedor.';
COMMENT ON COLUMN movimentacao_estoque.nf_data_emissao IS 'Data de emissão da Nota Fiscal do fornecedor.';
COMMENT ON COLUMN movimentacao_estoque.status IS 'Status do registro de movimentação (Ex: CONCLUIDA, PENDENTE_AUDITORIA).'; 