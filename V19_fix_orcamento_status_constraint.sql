-- V19: Ajusta constraint chk_orcamento_status para incluir todos os status atualmente utilizados

-- Remove a constraint existente, se houver
ALTER TABLE public.orcamento
DROP CONSTRAINT IF EXISTS chk_orcamento_status;

-- Cria novamente incluindo o conjunto completo de status válidos
ALTER TABLE public.orcamento
ADD CONSTRAINT chk_orcamento_status CHECK (
    status IN (
        -- Fases de análise de orçamento
        'EM_ELABORACAO',          -- Orçamento em edição, cotações abertas
        'AGUARDANDO_COTACAO',     -- Requisição aguardando lançamento das cotações
        'AGUARDANDO_APROVACAO',   -- Enviado ao supervisor
        'APROVADO_TOTALMENTE',    -- Todos os itens aprovados
        'APROVADO_PARCIALMENTE',  -- Parte dos itens aprovados
        'REPROVADO_TOTALMENTE',   -- Todos reprovados
        
        -- Nomes legados / genéricos de análise
        'PENDENTE', 'APROVADO', 'REPROVADO', 'CANCELADO',

        -- Fases do Pedido de Compra
        'AGUARDANDO_ENVIO',
        'PEDIDO_REALIZADO',
        'RECEBIDO',
        'RECEBIDO_COM_DIVERGENCIA',
        'FINALIZADO'
    )
);

COMMENT ON CONSTRAINT chk_orcamento_status ON public.orcamento IS 'Garante que o status do orçamento/pedido esteja dentro da lista permitida.'; 