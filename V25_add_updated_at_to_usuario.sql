-- V25: Adiciona coluna updated_at à tabela usuario para armazenar a data/hora da última modificação.

-- 1. Adiciona a coluna, caso ainda não exista.
ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 2. Atualiza todas as linhas existentes com a data/hora atual (caso valor nulo).
UPDATE usuario SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

-- 3. Cria ou substitui trigger para atualizar automaticamente o campo updated_at a cada UPDATE.
DROP TRIGGER IF EXISTS trg_usuario_updated_at ON usuario;

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuario_updated_at
BEFORE UPDATE ON usuario
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp(); 