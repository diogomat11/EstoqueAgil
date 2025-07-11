-- scripts/seed_dev.sql
-- =====================================================================
--  SEED DE DADOS PARA AMBIENTE DE DESENVOLVIMENTO
-- ---------------------------------------------------------------------
--  Gera registros aleatórios para as principais tabelas do fluxo de
--  compras → estoque, a fim de facilitar testes da aplicação, KPIs e
--  cálculo de lead-time.  NÃO execute em produção!
-- =====================================================================

BEGIN;

/* ---------------------------------------------------------------
   0) Limpeza de dados operacionais (mantém cadastros base)        
---------------------------------------------------------------- */
TRUNCATE TABLE
    requisicao_itens,
    orcamento_item,
    movimentacao_estoque_item,
    estoque_filial,
    orcamento_cotacao,
    movimentacao_estoque,
    auditoria_divergencia,
    log_auditoria;

-- Apaga requisições que não estejam referenciadas por orçamentos de NEGOCIACAO (ou outros)
DELETE FROM requisicao WHERE id NOT IN (SELECT DISTINCT requisicao_id FROM orcamento WHERE requisicao_id IS NOT NULL);

DO $$
BEGIN
  -- Remove orçamentos de análise e pedidos gerados em execuções anteriores, preservando negociações vinculadas a itens
  DELETE FROM orcamento WHERE tipo IN ('ORCAMENTO','PEDIDO');
END$$;

/* === INÍCIO BLOCO DESATIVADO =====================================
   As seções 1 a 5 foram desativadas para garantir que cadastros
   base (Usuários, Filiais, Itens, Categorias, Fornecedores, Empresa)
   não sejam criados, alterados ou removidos neste ambiente.
   ===================================================================
*/

/* ---------------------------------------------------------------
   6) Estoque inicial por filial                                   
---------------------------------------------------------------- */
INSERT INTO estoque_filial (filial_id, item_id, quantidade)
SELECT f.id,
       i.id,
       (RANDOM()*200)::INT
FROM   filial f
CROSS JOIN LATERAL (
         SELECT id FROM item_estoque ORDER BY RANDOM() LIMIT 30
       ) i
ON CONFLICT (filial_id, item_id)
DO UPDATE SET quantidade = EXCLUDED.quantidade;

/* ---------------------------------------------------------------
   7) Requisições + Itens                                          
---------------------------------------------------------------- */
-- Salva os IDs gerados em tabela temporária para relacionamentos
CREATE TEMP TABLE _req_ids(id INT PRIMARY KEY);

WITH dados_req AS (
    SELECT
        (SELECT id FROM usuario ORDER BY RANDOM() LIMIT 1)        AS solicitante_id,
        (SELECT id FROM filial  ORDER BY RANDOM() LIMIT 1)        AS filial_id,
        NOW() - ((RANDOM()*60)::INT || ' days')::INTERVAL        AS data_req,
        gs                                                         AS seq
    FROM generate_series(1,60) gs
), inserted AS (
    INSERT INTO requisicao (solicitante_id, filial_id, departamento, justificativa, status, data_requisicao)
    SELECT solicitante_id,
           filial_id,
           'DEP'||seq,
           'Requisição automatizada',
           'APROVADA',
           data_req
    FROM dados_req
    RETURNING id
)
INSERT INTO _req_ids (id)
SELECT id FROM inserted;

-- Itens para cada requisição
INSERT INTO requisicao_itens (requisicao_id, item_estoque_id, quantidade)
SELECT r.id,
       i.id,
       (RANDOM()*30 + 1)::INT
FROM   _req_ids r
JOIN LATERAL (
       SELECT id FROM item_estoque ORDER BY RANDOM() LIMIT 3
) i ON TRUE;

/* ---------------------------------------------------------------
   8) Pedidos de compra (orcamento.tipo = 'PEDIDO')                
---------------------------------------------------------------- */
CREATE TEMP TABLE _ped_ids(id INT PRIMARY KEY);

WITH inserted_ped AS (
    INSERT INTO orcamento (
        requisicao_id, id_fornecedor, filial_id,
        valor_total, validade_fim,
        usuario_id, status, tipo, data)
    SELECT r.id,
           (SELECT id FROM fornecedor ORDER BY RANDOM() LIMIT 1),
           (SELECT filial_id FROM requisicao WHERE id = r.id),
           (RANDOM()*5000 + 500)::NUMERIC(12,2),
           NOW() + '30 days'::INTERVAL,
           (SELECT solicitante_id FROM requisicao WHERE id = r.id),
           'AGUARDANDO_ENVIO',
           'PEDIDO',
           (SELECT data_requisicao FROM requisicao WHERE id = r.id) + ((RANDOM()*7 + 1)::INT || ' days')::INTERVAL
    FROM   _req_ids r
    RETURNING id
)
INSERT INTO _ped_ids (id)
SELECT id FROM inserted_ped;

/* ---------------------------------------------------------------
   9) Itens dos pedidos                                            
---------------------------------------------------------------- */
INSERT INTO orcamento_item (orcamento_id, item_estoque_id, quantidade, valor_unitario, status)
SELECT p.id,
       i.id,
       (RANDOM()*5 + 1)::INT,
       ROUND((RANDOM()*5 + 5)::numeric, 2),
       'APROVADO'
FROM   _ped_ids p
JOIN LATERAL (
       SELECT id FROM item_estoque ORDER BY RANDOM() LIMIT 3
) i ON TRUE;

/* ---------------------------------------------------------------
  10) Movimentações de entrada (recebimento)                      
---------------------------------------------------------------- */
CREATE TEMP TABLE _mov_ids(mov_id INT PRIMARY KEY, pedido_id INT);

WITH inserted_mov AS (
    INSERT INTO movimentacao_estoque (
        tipo, filial_id, usuario_id, pedido_compra_id,
        observacao, status, data_movimentacao)
    SELECT 'ENTRADA',
           o.filial_id,
           o.usuario_id,
           o.id,
           'Entrada automática',
           'CONCLUIDA',
           o.data + ((RANDOM()*5 + 1)::INT || ' days')::INTERVAL
    FROM   orcamento o
    WHERE  o.tipo = 'PEDIDO'
    RETURNING id, pedido_compra_id
)
INSERT INTO _mov_ids (mov_id, pedido_id)
SELECT id, pedido_compra_id FROM inserted_mov;

-- Itens de cada movimentação (baseados nos itens do pedido)
INSERT INTO movimentacao_estoque_item (
    movimentacao_id, item_estoque_id, quantidade_movimentada,
    valor_unitario_na_movimentacao, status)
SELECT m.mov_id,
       oi.item_estoque_id,
       oi.quantidade,
       oi.valor_unitario,
       'CONCLUIDO'
FROM   _mov_ids m
JOIN   orcamento_item oi ON oi.orcamento_id = m.pedido_id;

COMMIT;

-- =========================== FIM ================================ 