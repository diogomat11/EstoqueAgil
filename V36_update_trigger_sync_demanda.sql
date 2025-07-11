-- Atualiza trigger sync_demanda para abranger novos status
BEGIN;

DROP TRIGGER IF EXISTS trg_sync_demanda ON requisicao;
DROP FUNCTION IF EXISTS sync_demanda_compras;

CREATE OR REPLACE FUNCTION sync_demanda_compras()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'AGUARDANDO_COTACAO' THEN
    UPDATE demanda SET etapa='COTACAO', descricao='Etapa COTACAO', updated_at=NOW()
     WHERE requisicao_id = NEW.id AND status <> 'ENCERRADO';
  ELSIF NEW.status = 'AGUARDANDO_APROVACAO' THEN
    UPDATE demanda SET etapa='APROVACAO', descricao='Etapa APROVACAO', updated_at=NOW()
     WHERE requisicao_id = NEW.id AND status <> 'ENCERRADO';
  ELSIF NEW.status = 'FINALIZADA' THEN
    UPDATE demanda SET etapa='CONCLUIDO', descricao='Etapa CONCLUIDO', updated_at=NOW(), status='ENCERRADO'
     WHERE requisicao_id = NEW.id AND status <> 'ENCERRADO';
  ELSIF NEW.status = 'AGUARDANDO_ENVIO' THEN
    UPDATE demanda SET etapa='PEDIDO', descricao='Etapa PEDIDO', updated_at=NOW()
     WHERE requisicao_id = NEW.id AND status <> 'ENCERRADO';
  ELSIF NEW.status IN ('RECEBIDO','FINALIZADO') THEN
    UPDATE demanda SET etapa='CONCLUIDO', descricao='Etapa CONCLUIDO', updated_at=NOW(), status='ENCERRADO'
     WHERE requisicao_id = NEW.id AND status <> 'ENCERRADO';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_demanda
AFTER UPDATE OF status ON requisicao
FOR EACH ROW EXECUTE FUNCTION sync_demanda_compras();

COMMIT; 