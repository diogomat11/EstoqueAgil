-- Remover colunas antigas da tabela de requisição, se existirem
ALTER TABLE requisicao DROP COLUMN IF EXISTS item_id;
ALTER TABLE requisicao DROP COLUMN IF EXISTS quantidade;

-- Adicionar novas colunas se elas não existirem
ALTER TABLE requisicao ADD COLUMN IF NOT EXISTS data_requisicao TIMESTAMPTZ DEFAULT now();
ALTER TABLE requisicao ADD COLUMN IF NOT EXISTS solicitante_id INTEGER REFERENCES usuario(id);
ALTER TABLE requisicao ADD COLUMN IF NOT EXISTS departamento VARCHAR(255);
ALTER TABLE requisicao ADD COLUMN IF NOT EXISTS justificativa TEXT;

-- Tabela para armazenar os múltiplos itens de uma requisição
CREATE TABLE IF NOT EXISTS requisicao_itens (
    id SERIAL PRIMARY KEY,
    requisicao_id INTEGER NOT NULL REFERENCES requisicao(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES item_estoque(id),
    quantidade NUMERIC(10, 2) NOT NULL
);

COMMENT ON TABLE requisicao_itens IS 'Armazena os itens individuais de uma requisição multi-item.';

-- Apagar a tabela antiga que não é mais usada
DROP TABLE IF EXISTS requisicao_item; 