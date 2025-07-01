-- Adiciona novos status ao ciclo de vida de um orçamento, especificamente para quando ele vira um Pedido de Compra.

-- Script para adicionar novos status ao ciclo de vida de um Pedido de Compra, garantindo a migração de dados existentes.

-- Etapa 1: Renomear a constraint antiga para um nome temporário, se ela existir.
-- Isso previne erros se o script for executado várias vezes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orcamento_status') THEN
    ALTER TABLE public.orcamento RENAME CONSTRAINT chk_orcamento_status TO chk_orcamento_status_old;
  END IF;
END;
$$;

-- Etapa 2: Atualizar os dados existentes para que sejam compatíveis com a nova regra.
-- Todos os pedidos que foram criados com o status 'APROVADO' agora passarão para 'AGUARDANDO_ENVIO'.
UPDATE public.orcamento
SET status = 'AGUARDANDO_ENVIO'
WHERE tipo = 'PEDIDO' AND status = 'APROVADO';

-- Etapa 3: Agora que os dados são compatíveis, remover a constraint antiga.
ALTER TABLE public.orcamento DROP CONSTRAINT IF EXISTS chk_orcamento_status_old;

-- Etapa 4: Adicionar a nova constraint com a lista completa e correta de status.
ALTER TABLE public.orcamento ADD CONSTRAINT chk_orcamento_status CHECK (status IN (
    'EM_ELABORACAO',         -- Orçamento sendo montado, cotações sendo inseridas.
    'AGUARDANDO_APROVACAO',  -- Orçamento enviado para análise do gestor.
    'APROVADO_TOTALMENTE',   -- Análise concluída, todos os itens aprovados.
    'APROVADO_PARCIALMENTE', -- Análise concluída, alguns itens aprovados e outros reprovados.
    'REPROVADO',             -- Análise concluída, todos os itens reprovados.
    
    -- Novos status para o ciclo de vida do Pedido de Compra
    'AGUARDANDO_ENVIO',      -- Pedido gerado, aguardando ser enviado ao fornecedor. (Substitui o antigo 'APROVADO')
    'PEDIDO_REALIZADO',      -- Pedido efetivamente enviado ao fornecedor.
    'RECEBIDO',              -- Mercadoria entregue pelo fornecedor, aguardando conferência.
    'FINALIZADO'             -- Mercadoria conferida e adicionada ao estoque.
));

COMMENT ON COLUMN public.orcamento.status IS 'Status do ciclo de vida do Orçamento/Pedido. Inclui status para análise e para o processo de compra.'; 