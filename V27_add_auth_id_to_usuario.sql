/*
  V27_add_auth_id_to_usuario.sql
  Adiciona a coluna auth_id à tabela usuario para armazenar o ID do usuário no Supabase Auth.
*/

ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS auth_id uuid UNIQUE;

-- Opcional: criar índice para busca mais rápida
CREATE UNIQUE INDEX IF NOT EXISTS usuario_auth_id_idx ON usuario(auth_id); 