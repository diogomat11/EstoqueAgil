import { Request, Response } from 'express';
import { pool } from '../database';

// GET /api/compras/historico?item_id=&filial_id=&meses=
export const historicoComprasConsumo = async (req: Request, res: Response) => {
  const { item_id, filial_id, meses } = req.query;
  const mesesInt = parseInt((meses as string) || '12', 10);

  const params: any[] = [];
  let filters = '';

  if (item_id) {
    params.push(item_id);
    filters += ` AND mi.item_estoque_id = $${params.length}`;
  }
  if (filial_id) {
    params.push(filial_id);
    filters += ` AND me.filial_id = $${params.length}`;
  }

  try {
    const query = `
      SELECT to_char(DATE_TRUNC('month', me.data_movimentacao), 'YYYY-MM') AS mes,
             SUM(CASE WHEN me.tipo = 'ENTRADA' THEN mi.quantidade_movimentada ELSE 0 END) AS total_entrada,
             SUM(CASE WHEN me.tipo = 'SAIDA'   THEN ABS(mi.quantidade_movimentada) ELSE 0 END) AS total_saida
      FROM movimentacao_estoque_item mi
      JOIN movimentacao_estoque me ON me.id = mi.movimentacao_id
      WHERE me.data_movimentacao >= (DATE_TRUNC('month', NOW()) - INTERVAL '${mesesInt} months')
        ${filters}
      GROUP BY DATE_TRUNC('month', me.data_movimentacao)
      ORDER BY mes;`;

    const result = await pool.query(query, params);
    res.json({ meses: mesesInt, rows: result.rows });
  } catch (err: any) {
    console.error('[COMPRAS] Erro ao obter histórico:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/compras/leadtime?item_id=&fornecedor_id=&meses=
export const leadTimeMedio = async (req: Request, res: Response) => {
  const { item_id, fornecedor_id, meses } = req.query;
  const mesesInt = parseInt((meses as string) || '12', 10);

  const params: any[] = [];
  let filters = '';

  if (item_id) {
    params.push(item_id);
    filters += ` AND mi.item_estoque_id = $${params.length}`;
  }
  if (fornecedor_id) {
    params.push(fornecedor_id);
    filters += ` AND o.fornecedor_id = $${params.length}`;
  }

  try {
    const query = `
      SELECT
        AVG(EXTRACT(EPOCH FROM (me.data_movimentacao - o.data)) / 86400)  AS leadtime_medio_dias,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (me.data_movimentacao - o.data))/86400)) AS p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (me.data_movimentacao - o.data))/86400)) AS p99,
        COUNT(*) AS amostra
      FROM movimentacao_estoque_item mi
      JOIN movimentacao_estoque me ON me.id = mi.movimentacao_id AND me.tipo='ENTRADA'
      JOIN orcamento o ON o.id = me.pedido_compra_id AND o.tipo='PEDIDO'
      WHERE me.data_movimentacao >= (NOW() - INTERVAL '${mesesInt} months')
        ${filters};`;

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err:any) {
    console.error('[COMPRAS] Erro lead-time:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/compras/ultimopreco?item_id=&fornecedor_id=
export const ultimoPrecoCompra = async (req: Request, res: Response) => {
  const { item_id, fornecedor_id } = req.query;
  if(!item_id){
    res.status(400).json({ error:'item_id obrigatório'});
    return;
  }
  const params:any[] = [item_id];
  let filter='';
  if(fornecedor_id){
    params.push(fornecedor_id);
    filter = ` AND o.fornecedor_id = $2`;
  }
  try {
    const query = `
      SELECT me.data_movimentacao AS data, mi.valor_unitario_na_movimentacao AS valor_unitario
      FROM movimentacao_estoque_item mi
      JOIN movimentacao_estoque me ON me.id = mi.movimentacao_id AND me.tipo='ENTRADA'
      LEFT JOIN orcamento o ON o.id = me.pedido_compra_id
      WHERE mi.item_estoque_id = $1 ${filter}
      ORDER BY me.data_movimentacao DESC
      LIMIT 1`;
    const result = await pool.query(query, params);
    if(result.rows.length===0){
      res.json(null);
    } else {
      res.json(result.rows[0]);
    }
  } catch(err:any){
    console.error('[COMPRAS] Erro ultimo preço:', err);
    res.status(500).json({ error: err.message });
  }
}; 