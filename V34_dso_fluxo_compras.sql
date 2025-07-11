-- Cria colunas e tabelas para integrar DSO ao fluxo de compras
BEGIN;

-- 1. Ajustes na tabela demanda
ALTER TABLE demanda ADD COLUMN IF NOT EXISTS requisicao_id INT;
ALTER TABLE demanda ADD COLUMN IF NOT EXISTS etapa VARCHAR(20);
ALTER TABLE demanda ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'EM_ANDAMENTO';

-- FK para requisicao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
     WHERE table_name='demanda' AND constraint_name='fk_demanda_requisicao') THEN
    ALTER TABLE demanda ADD CONSTRAINT fk_demanda_requisicao FOREIGN KEY (requisicao_id)
      REFERENCES requisicao(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_demanda_fluxo ON demanda (requisicao_id, etapa, status);

-- 2. Histórico de demanda
CREATE TABLE IF NOT EXISTS demanda_historico (
    id SERIAL PRIMARY KEY,
    demanda_id INT NOT NULL REFERENCES demanda(id) ON DELETE CASCADE,
    acao VARCHAR(50),
    usuario_id INT REFERENCES usuario(id),
    observacao TEXT,
    data TIMESTAMP DEFAULT NOW()
);

COMMIT; 