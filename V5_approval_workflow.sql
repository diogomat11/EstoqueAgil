-- Adiciona a capacidade de aprovar/reprovar itens individualmente em uma requisição.

-- 1. Adicionar status e justificativa na tabela de itens da requisição.
ALTER TABLE requisicao_itens ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE requisicao_itens ADD COLUMN IF NOT EXISTS justificativa_reprovacao TEXT;

COMMENT ON COLUMN requisicao_itens.status IS 'Status do item individual na requisição (PENDENTE, APROVADO, REPROVADO)';

-- 2. Adicionar rastreabilidade para requisições geradas a partir de itens reprovados.
ALTER TABLE requisicao ADD COLUMN IF NOT EXISTS requisicao_origem_id INTEGER REFERENCES requisicao(id);

COMMENT ON COLUMN requisicao.requisicao_origem_id IS 'Link para a requisição original caso esta tenha sido gerada a partir de itens reprovados.'; 