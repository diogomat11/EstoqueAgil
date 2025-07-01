-- Corrigir a constraint de status da tabela de requisição para acomodar o fluxo de orçamento.

-- 1. Remover a constraint antiga, se ela existir.
ALTER TABLE requisicao DROP CONSTRAINT IF EXISTS chk_requisicao_status;

-- 2. Adicionar a nova constraint com todos os status necessários para o fluxo completo.
ALTER TABLE requisicao ADD CONSTRAINT chk_requisicao_status CHECK (status IN (
    'PENDENTE',                 -- Requisição criada, aguardando ação.
    'AGUARDANDO_COTACAO',       -- Requisição enviada para cotação de preços.
    'AGUARDANDO_APROVACAO',     -- Orçamento finalizado, aguardando aprovação do gestor.
    'APROVADA',                 -- Requisição aprovada, pronta para gerar pedido de compra.
    'REPROVADA',                -- Requisição reprovada.
    'PARCIALMENTE_APROVADA',    -- Apenas alguns itens foram aprovados.
    'FINALIZADA'                -- Processo de compra concluído.
));

COMMENT ON COLUMN requisicao.status IS 'Status do processo de requisição: PENDENTE, AGUARDANDO_COTACAO, AGUARDANDO_APROVACAO, APROVADA, REPROVADA, PARCIALMENTE_APROVADA, FINALIZADA'; 