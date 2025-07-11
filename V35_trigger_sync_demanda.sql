BEGIN;

-- Trigger function para alinhar etapa da demanda quando status da requisição muda
CREATE OR REPLACE FUNCTION sync_demanda_compras()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.status = 'AGUARDANDO_COTACAO' THEN
      UPDATE demanda SET etapa='COTACAO', descricao='Etapa COTACAO', updated_at=NOW()
        WHERE requisicao_id = NEW.id AND status<>'ENCERRADO';
    ELSIF NEW.status = 'AGUARDANDO_APROVACAO' THEN
      UPDATE demanda SET etapa='APROVACAO', descricao='Etapa APROVACAO', updated_at=NOW()
        WHERE requisicao_id = NEW.id AND status<>'ENCERRADO';
    ELSIF NEW.status = 'FINALIZADA' THEN
      UPDATE demanda SET etapa='CONCLUIDO', descricao='Etapa CONCLUIDO', updated_at=NOW(), status='ENCERRADO'
        WHERE requisicao_id = NEW.id AND status<>'ENCERRADO';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_demanda ON requisicao;
CREATE TRIGGER trg_sync_demanda
AFTER UPDATE OF status ON requisicao
FOR EACH ROW EXECUTE FUNCTION sync_demanda_compras();

COMMIT; 