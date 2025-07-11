-- Migration V30: adiciona filial_id à tabela orcamento
-- Executar com Flyway ou ferramenta equivalente

-- Adiciona a coluna filial_id à tabela orcamento para rastrear a filial responsável por Pedidos de Compra
ALTER TABLE public.orcamento
ADD COLUMN IF NOT EXISTS filial_id INTEGER REFERENCES filial(id);

COMMENT ON COLUMN public.orcamento.filial_id IS 'Filial responsável pelo Pedido de Compra (registros do tipo = \"PEDIDO\").'; 