-- Adiciona a coluna para armazenar a referência ao fornecedor em orçamentos do tipo 'PEDIDO'
ALTER TABLE public.orcamento
ADD COLUMN IF NOT EXISTS id_fornecedor INTEGER;

-- Adiciona a coluna para o valor total consolidado do pedido
ALTER TABLE public.orcamento
ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10, 2);

-- Adiciona a coluna para a data em que a aprovação foi processada
ALTER TABLE public.orcamento
ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMP WITH TIME ZONE;

-- Adiciona a coluna para identificar o usuário que aprovou
ALTER TABLE public.orcamento
ADD COLUMN IF NOT EXISTS aprovador_id INTEGER;

-- Adiciona a coluna para identificar o usuário criador/solicitante
ALTER TABLE public.orcamento
ADD COLUMN IF NOT EXISTS usuario_id INTEGER;

-- Adiciona as chaves estrangeiras para garantir a integridade dos dados
-- (Estes comandos podem falhar se já existirem, o que não é um problema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orcamento_fornecedor'
  ) THEN
    ALTER TABLE public.orcamento
    ADD CONSTRAINT fk_orcamento_fornecedor
    FOREIGN KEY (id_fornecedor)
    REFERENCES public.fornecedor(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orcamento_aprovador'
  ) THEN
    ALTER TABLE public.orcamento
    ADD CONSTRAINT fk_orcamento_aprovador
    FOREIGN KEY (aprovador_id)
    REFERENCES public.usuario(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orcamento_usuario'
  ) THEN
    ALTER TABLE public.orcamento
    ADD CONSTRAINT fk_orcamento_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES public.usuario(id)
    ON DELETE SET NULL;
  END IF;
END;
$$;

-- Adiciona comentários para documentar as novas colunas
COMMENT ON COLUMN public.orcamento.id_fornecedor IS 'Referência ao fornecedor para orçamentos que são Pedidos de Compra (tipo=PEDIDO).';
COMMENT ON COLUMN public.orcamento.valor_total IS 'Valor total consolidado de um Pedido de Compra.';
COMMENT ON COLUMN public.orcamento.data_aprovacao IS 'Data e hora em que o orçamento de análise foi aprovado, gerando o pedido.';
COMMENT ON COLUMN public.orcamento.aprovador_id IS 'ID do usuário que realizou a aprovação final do orçamento.';
COMMENT ON COLUMN public.orcamento.usuario_id IS 'ID do usuário criador do orçamento ou do solicitante original (em caso de PEDIDO).'; 