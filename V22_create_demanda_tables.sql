-- V22_create_demanda_tables.sql
-- Cria tabelas para o módulo DSO - Diretório de Serviços Operacionais

BEGIN;

CREATE TABLE IF NOT EXISTS demanda (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    prazo_conclusao TIMESTAMP WITH TIME ZONE,
    tipo TEXT,
    cadastrado_por BIGINT REFERENCES usuario(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de relação N:N entre demanda e usuários responsáveis
CREATE TABLE IF NOT EXISTS demanda_responsavel (
    demanda_id BIGINT REFERENCES demanda(id) ON DELETE CASCADE,
    usuario_id BIGINT REFERENCES usuario(id) ON DELETE CASCADE,
    PRIMARY KEY (demanda_id, usuario_id)
);

-- Índice para facilitar busca de demandas próximas do prazo
CREATE INDEX IF NOT EXISTS idx_demanda_prazo ON demanda (prazo_conclusao);

COMMIT; 