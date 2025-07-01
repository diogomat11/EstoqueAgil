-- Garante que uma requisição só pode estar associada a um único orçamento.

-- Adiciona uma constraint de unicidade na coluna 'requisicao_id' da tabela 'orcamento'.
-- Isso impede a criação de múltiplos orçamentos para a mesma requisição.
ALTER TABLE orcamento
ADD CONSTRAINT uq_orcamento_requisicao_id UNIQUE (requisicao_id);

COMMENT ON CONSTRAINT uq_orcamento_requisicao_id ON orcamento IS 'Garante que cada requisição tenha no máximo um orçamento associado.'; 