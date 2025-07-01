-- Remove a antiga restrição de chave única que impedia múltiplos pedidos para a mesma requisição.
-- O bloco DO/END garante que o comando não falhe se a restrição já tiver sido removida manualmente.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_orcamento_requisicao_id') THEN
    ALTER TABLE public.orcamento DROP CONSTRAINT uq_orcamento_requisicao_id;
  END IF;
END;
$$;

-- Cria um novo índice único parcial.
-- Esta regra garante que só pode haver UM orçamento do tipo 'ORCAMENTO' para cada requisição,
-- mas permite múltiplos orçamentos do tipo 'PEDIDO' para a mesma requisição.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orcamento_requisicao_id_para_analise
ON public.orcamento (requisicao_id)
WHERE (tipo = 'ORCAMENTO' AND requisicao_id IS NOT NULL);

COMMENT ON INDEX public.uq_orcamento_requisicao_id_para_analise IS 'Garante que só pode haver uma análise de orçamento (tipo=ORCAMENTO) por requisição.'; 