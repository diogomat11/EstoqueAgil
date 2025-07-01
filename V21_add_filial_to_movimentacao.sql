-- V21: adiciona coluna filial_id em movimentacao_estoque

ALTER TABLE public.movimentacao_estoque
  ADD COLUMN IF NOT EXISTS filial_id INTEGER REFERENCES filial(id);

COMMENT ON COLUMN public.movimentacao_estoque.filial_id IS 'Filial à qual a movimentação pertence.'; 