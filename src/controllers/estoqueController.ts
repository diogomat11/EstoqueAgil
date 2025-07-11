import { Request, Response } from 'express';
import { pool } from '../database';

/**
 * Controller com consultas de estoque para painéis e alertas.
 * GET /api/estoque/resumo       → Indicadores gerais (valor total, itens em falta / em excesso).
 * GET /api/estoque/alertas      → Lista de itens abaixo do estoque mínimo ou acima do máximo.
 */

// GET /api/estoque/resumo
export const getEstoqueResumo = async (req: Request, res: Response) => {
  try {
    /*
      1) Valor total em estoque (somatório quantidade * valor unitário).
      2) Qtde de itens abaixo do estoque mínimo (somando todas as filiais).
      3) Qtde total de itens distintos controlados.
    */

    const valorQuery = `
      SELECT COALESCE(SUM(ef.quantidade * COALESCE(ie.valor, 0)), 0) AS valor_total
      FROM estoque_filial ef
      JOIN item_estoque ie ON ie.id = ef.item_id;
    `;

    const lowStockQuery = `
      SELECT COUNT(*) AS itens_baixo_estoque
      FROM (
        SELECT ie.id, SUM(ef.quantidade) AS total_qtde, ie.estoque_minimo
        FROM estoque_filial ef
        JOIN item_estoque ie ON ie.id = ef.item_id
        GROUP BY ie.id, ie.estoque_minimo
        HAVING SUM(ef.quantidade) < ie.estoque_minimo
      ) s;
    `;

    const totalItensQuery = `SELECT COUNT(*) AS total_itens FROM item_estoque;`;

    const [valorResult, lowResult, totalResult] = await Promise.all([
      pool.query(valorQuery),
      pool.query(lowStockQuery),
      pool.query(totalItensQuery)
    ]);

    res.json({
      valor_total: parseFloat(valorResult.rows[0].valor_total || 0),
      itens_baixo_estoque: parseInt(lowResult.rows[0].itens_baixo_estoque || 0, 10),
      total_itens: parseInt(totalResult.rows[0].total_itens || 0, 10)
    });
  } catch (err: any) {
    console.error('[ESTOQUE] Erro ao obter resumo:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/estoque/alertas
export const getEstoqueAlertas = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        f.id AS filial_id,
        f.endereco AS filial_nome,
        ie.id AS item_id,
        ie.codigo,
        ie.descricao,
        ie.estoque_minimo,
        ef.quantidade
      FROM estoque_filial ef
      JOIN filial f ON f.id = ef.filial_id
      JOIN item_estoque ie ON ie.id = ef.item_id
      WHERE ef.quantidade < ie.estoque_minimo
      ORDER BY f.endereco, ie.descricao;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err: any) {
    console.error('[ESTOQUE] Erro ao obter alertas:', err);
    res.status(500).json({ error: err.message });
  }
};

// === KPIs avançados ===
export const getEstoqueKPIs = async (req: Request, res: Response) => {
  try {
    const valorQuery = `
      SELECT COALESCE(SUM(ef.quantidade * COALESCE(ie.valor, 0)), 0) AS valor_total
      FROM estoque_filial ef
      JOIN item_estoque ie ON ie.id = ef.item_id;`;

    const lowStockQuery = `
      SELECT COUNT(*) AS itens_baixo_estoque
      FROM (
        SELECT ie.id, SUM(ef.quantidade) AS total_qtde, ie.estoque_minimo
        FROM estoque_filial ef
        JOIN item_estoque ie ON ie.id = ef.item_id
        GROUP BY ie.id, ie.estoque_minimo
        HAVING SUM(ef.quantidade) < ie.estoque_minimo
      ) s;`;

    const consumo30Query = `
      SELECT COALESCE(SUM(mi.quantidade_movimentada),0) AS consumo_qtd_30d
      FROM movimentacao_estoque_item mi
      JOIN movimentacao_estoque me ON me.id = mi.movimentacao_id
      WHERE me.tipo = 'SAIDA' AND me.data_movimentacao >= NOW() - INTERVAL '30 days';`;

    const estoqueTotalQuery = `SELECT COALESCE(SUM(quantidade),0) AS estoque_total FROM estoque_filial;`;

    const consumoValorAnoQuery = `
      SELECT COALESCE(SUM(mi.quantidade_movimentada * COALESCE(ie.valor,0)),0) AS consumo_valor_ano
      FROM movimentacao_estoque_item mi
      JOIN movimentacao_estoque me ON me.id = mi.movimentacao_id
      JOIN item_estoque ie ON ie.id = mi.item_estoque_id
      WHERE me.tipo='SAIDA' AND me.data_movimentacao >= NOW() - INTERVAL '365 days';`;

    const [valorRes, lowRes, consumo30Res, estoqueTotalRes, consumoValorAnoRes] = await Promise.all([
      pool.query(valorQuery),
      pool.query(lowStockQuery),
      pool.query(consumo30Query),
      pool.query(estoqueTotalQuery),
      pool.query(consumoValorAnoQuery)
    ]);

    const valor_total = parseFloat(valorRes.rows[0].valor_total || 0);
    const itens_baixo_estoque = parseInt(lowRes.rows[0].itens_baixo_estoque || 0, 10);
    const consumo_qtd_30d = parseFloat(consumo30Res.rows[0].consumo_qtd_30d || 0);
    const estoque_total_qtd = parseFloat(estoqueTotalRes.rows[0].estoque_total || 0);
    const consumo_valor_ano = parseFloat(consumoValorAnoRes.rows[0].consumo_valor_ano || 0);

    const consumo_diario = consumo_qtd_30d / 30;
    const cobertura_media_dias = consumo_diario > 0 ? +(estoque_total_qtd / consumo_diario).toFixed(1) : null;

    const giro_ano = valor_total > 0 ? +(consumo_valor_ano / valor_total).toFixed(2) : null;

    res.json({ valor_total, itens_baixo_estoque, cobertura_media_dias, giro_ano });
  } catch (err:any) {
    console.error('[ESTOQUE] Erro ao obter KPIs:', err);
    res.status(500).json({ error: err.message });
  }
};

export const getCoberturaEstoque = async (req: Request, res: Response) => {
  const diasParam = parseInt(req.query.dias as string || '15',10); // limite maximo de dias de cobertura
  const diasPeriodo = 30; // consumo médio baseado em últimos 30d
  try {
    const query = `
      WITH consumo AS (
        SELECT mi.item_estoque_id AS item_id,
               SUM(mi.quantidade_movimentada)::numeric / ${diasPeriodo} AS consumo_diario
        FROM movimentacao_estoque_item mi
        JOIN movimentacao_estoque me ON me.id = mi.movimentacao_id
        WHERE me.tipo = 'SAIDA' AND me.data_movimentacao >= NOW() - INTERVAL '${diasPeriodo} days'
        GROUP BY mi.item_estoque_id
      ), saldo AS (
        SELECT item_id, SUM(quantidade)::numeric AS estoque
        FROM estoque_filial
        GROUP BY item_id
      )
      SELECT i.id,
             i.codigo,
             i.descricao,
             COALESCE(s.estoque,0)                            AS estoque_atual,
             COALESCE(c.consumo_diario,0)                     AS consumo_diario,
             CASE WHEN COALESCE(c.consumo_diario,0) > 0 THEN ROUND(COALESCE(s.estoque,0)/c.consumo_diario,1) END AS cobertura_dias
      FROM item_estoque i
      LEFT JOIN consumo c ON c.item_id = i.id
      LEFT JOIN saldo s   ON s.item_id = i.id
      WHERE COALESCE(c.consumo_diario,0) > 0
        AND (COALESCE(s.estoque,0)/c.consumo_diario) <= $1
      ORDER BY cobertura_dias ASC NULLS FIRST, i.descricao;`;
    const result = await pool.query(query,[diasParam]);
    res.json({ dias_threshold: diasParam, items: result.rows });
  } catch(err:any) {
    console.error('[ESTOQUE] Erro ao obter cobertura estoque:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/estoque/visao
export const getEstoqueVisao = async (req: Request, res: Response) => {
  const filialId = parseInt(req.query.filial_id as string, 10);
  const categoriaId = req.query.categoria_id ? parseInt(req.query.categoria_id as string, 10) : null;
  const comodato = req.query.comodato ? (req.query.comodato as string) : null; // 'true' | 'false'

  if (!filialId) {
    res.status(400).json({ error: 'filial_id é obrigatório' });
    return;
  }

  try {
    const query = `
      WITH consumo AS (
        SELECT mi.item_estoque_id AS item_id,
               SUM(ABS(mi.quantidade_movimentada)) AS consumo_30d
        FROM movimentacao_estoque_item mi
        JOIN movimentacao_estoque me ON me.id = mi.movimentacao_id
        WHERE me.tipo = 'SAIDA'
          AND me.filial_id = $1
          AND me.data_movimentacao >= NOW() - INTERVAL '30 days'
        GROUP BY mi.item_estoque_id
      )
      SELECT
        i.id,
        i.codigo,
        i.descricao,
        cat.descricao                    AS categoria,
        i.estoque_minimo,
        ef.quantidade               AS estoque,
        COALESCE(c.consumo_30d,0)   AS consumo_30d,
        CASE WHEN COALESCE(c.consumo_30d,0) > 0 
             THEN ROUND((ef.quantidade::numeric) / (ABS(c.consumo_30d) / 30.0),1) END AS cobertura_dias,
        CASE
          WHEN ef.quantidade <= i.estoque_minimo
                OR (COALESCE(c.consumo_30d,0) > 0 AND (ef.quantidade / (ABS(c.consumo_30d) / 30.0)) < 5) THEN 'CRITICO'
          WHEN COALESCE(c.consumo_30d,0) > 0 AND (ef.quantidade / (ABS(c.consumo_30d) / 30.0)) < 30 THEN 'ABAIXO'
          WHEN COALESCE(c.consumo_30d,0) > 0 AND (ef.quantidade / (ABS(c.consumo_30d) / 30.0)) > 60 THEN 'INFLADO'
          ELSE 'NORMAL'
        END AS estado
      FROM estoque_filial ef
      JOIN item_estoque i ON i.id = ef.item_id
      LEFT JOIN categorias cat ON cat.id = i.categoria_id
      LEFT JOIN consumo c ON c.item_id = i.id
      WHERE ef.filial_id = $1
        AND ($2::int IS NULL OR i.categoria_id = $2)
        AND ($3::boolean IS NULL OR i.is_comodato = $3::boolean)
      ORDER BY estado DESC, cobertura_dias NULLS LAST, i.descricao;`

    const params = [filialId, categoriaId, comodato !== null ? comodato === 'true' : null];

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch(err:any) {
    console.error('[ESTOQUE] Erro ao obter visão de estoque:', err);
    res.status(500).json({ error: err.message });
  }
}; 