-- Corrige estrutura da tabela contas_pagar
BEGIN;

-- Adiciona colunas ausentes se necessário
ALTER TABLE contas_pagar
  ADD COLUMN IF NOT EXISTS requisicao_id integer REFERENCES requisicao(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Renomeia coluna pedido_compra_id -> pedido_id se existir
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contas_pagar' AND column_name='pedido_compra_id') THEN
   ALTER TABLE contas_pagar RENAME COLUMN pedido_compra_id TO pedido_id;
 END IF;
END$$;

-- Garante trigger de updated_at
CREATE OR REPLACE FUNCTION f_upd_cp() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_upd_cp ON contas_pagar;
CREATE TRIGGER trg_upd_cp
BEFORE UPDATE ON contas_pagar
FOR EACH ROW EXECUTE FUNCTION f_upd_cp();

COMMIT; 