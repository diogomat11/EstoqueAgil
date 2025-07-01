-- V14: Aumenta o tamanho da coluna de status na tabela de orçamentos.
 
-- Altera a coluna 'status' para VARCHAR(50) para acomodar os novos
-- valores de status mais longos, como 'RECEBIDO_COM_DIVERGENCIA'.
ALTER TABLE public.orcamento
ALTER COLUMN status TYPE VARCHAR(50); 