-- V26: Adiciona colunas ativo e mudar_senha à tabela usuario.

-- 1. Adiciona coluna ativo (indica se o usuário está habilitado) default true.
ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

-- 2. Adiciona coluna mudar_senha (obriga troca de senha no primeiro login) default true.
ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS mudar_senha BOOLEAN NOT NULL DEFAULT true;

-- 3. Atualiza registros existentes que estejam com NULL.
UPDATE usuario SET ativo = true WHERE ativo IS NULL;
UPDATE usuario SET mudar_senha = true WHERE mudar_senha IS NULL; 