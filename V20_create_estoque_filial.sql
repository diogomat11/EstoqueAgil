-- V20: Cria tabela de saldo por filial

CREATE TABLE IF NOT EXISTS public.estoque_filial (
    filial_id  INTEGER NOT NULL REFERENCES filial(id) ON DELETE CASCADE,
    item_id    INTEGER NOT NULL REFERENCES item_estoque(id) ON DELETE CASCADE,
    quantidade NUMERIC(10,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (filial_id, item_id)
);

COMMENT ON TABLE public.estoque_filial IS 'Saldo de cada item em cada filial.'; 