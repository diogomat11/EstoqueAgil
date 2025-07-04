/*  LIMPEZA DE DADOS OPERACIONAIS
    Mantém: item_estoque, fornecedor, usuario, categoria, filial, etc.
    Remove: requisição (+ itens), orçamentos/pedidos (+ cotações/itens),
            movimentações, estoque_filial, auditorias de divergência.

    IMPORTANTE:
    – “TRUNCATE … RESTART IDENTITY CASCADE” apaga todas as linhas,
      reinicia as sequences e respeita as FKs em cascata.
    – Ajuste os nomes das tabelas se estiverem diferentes no seu banco.
*/

BEGIN;

/* 1. Requisições */
TRUNCATE TABLE requisicao_itens           RESTART IDENTITY CASCADE;
TRUNCATE TABLE requisicao                 RESTART IDENTITY CASCADE;

/* 2. Orçamentos / Pedidos */
TRUNCATE TABLE orcamento_cotacao          RESTART IDENTITY CASCADE;
TRUNCATE TABLE orcamento_item             RESTART IDENTITY CASCADE;
TRUNCATE TABLE orcamento                  RESTART IDENTITY CASCADE;

/* 3. Movimentações e estoque */
TRUNCATE TABLE movimentacao_estoque_item  RESTART IDENTITY CASCADE;
TRUNCATE TABLE movimentacao_estoque       RESTART IDENTITY CASCADE;
TRUNCATE TABLE estoque_filial             RESTART IDENTITY CASCADE;

/* 4. Auditorias (opcional) */
TRUNCATE TABLE auditoria_divergencia      RESTART IDENTITY CASCADE;
TRUNCATE TABLE log_auditoria              RESTART IDENTITY CASCADE;

COMMIT;

/* Fim do script */