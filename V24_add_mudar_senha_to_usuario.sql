-- V24_add_mudar_senha_to_usuario.sql

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS mudar_senha BOOLEAN NOT NULL DEFAULT true;

-- Index para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_usuario_mudar_senha ON usuario (mudar_senha); 