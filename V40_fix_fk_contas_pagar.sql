BEGIN;

-- Remove FK antiga que apontava para pedido_compra (caso ainda exista)
ALTER TABLE IF EXISTS contas_pagar
  DROP CONSTRAINT IF EXISTS contas_pagar_pedido_compra_id_fkey;

-- Garante existência da coluna correta
ALTER TABLE contas_pagar
  ADD COLUMN IF NOT EXISTS pedido_id integer;

-- Cria a FK apenas se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_contas_pagar_pedido'
  ) THEN
    ALTER TABLE contas_pagar
      ADD CONSTRAINT fk_contas_pagar_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES orcamento(id)
        ON DELETE SET NULL;
  END IF;
END$$;

COMMIT; 