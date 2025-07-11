-- Cria contas a pagar vinculadas a pedidos/requisições
BEGIN;

CREATE TABLE contas_pagar (
  id serial PRIMARY KEY,
  requisicao_id integer REFERENCES requisicao(id) ON DELETE CASCADE,
  pedido_id integer REFERENCES orcamento(id) ON DELETE SET NULL,
  fornecedor_id integer REFERENCES fornecedor(id) ON DELETE SET NULL,
  valor numeric(14,2) NOT NULL,
  data_vencimento date NOT NULL,
  status varchar(15) NOT NULL DEFAULT 'ABERTO', -- ABERTO | PAGO
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_contas_pagar_status ON contas_pagar(status);

CREATE OR REPLACE FUNCTION trg_contas_pagar_updated()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contas_pagar_updated
BEFORE UPDATE ON contas_pagar
FOR EACH ROW EXECUTE FUNCTION trg_contas_pagar_updated();

COMMIT; 