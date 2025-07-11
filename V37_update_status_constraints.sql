-- Atualiza restrições e tamanho dos campos de status
BEGIN;

-- Aumentar tamanho das colunas status
ALTER TABLE requisicao ALTER COLUMN status TYPE varchar(30);
ALTER TABLE orcamento  ALTER COLUMN status TYPE varchar(30);

-- Recria constraint de status da requisicao
ALTER TABLE requisicao DROP CONSTRAINT IF EXISTS chk_requisicao_status;
ALTER TABLE requisicao ADD CONSTRAINT chk_requisicao_status
CHECK (status IN (
  'PENDENTE',
  'EM_ELABORACAO',
  'AGUARDANDO_COTACAO',
  'AGUARDANDO_APROVACAO',
  'APROVADA',
  'REPROVADA',
  'PEDIDO',
  'AGUARDANDO_RECEBIMENTO',
  'RECEBIDO',
  'FINALIZADA'
));

COMMIT; 