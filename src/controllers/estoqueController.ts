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
        f.nome AS filial_nome,
        ie.id AS item_id,
        ie.codigo,
        ie.descricao,
        ie.estoque_minimo,
        ef.quantidade
      FROM estoque_filial ef
      JOIN filial f ON f.id = ef.filial_id
      JOIN item_estoque ie ON ie.id = ef.item_id
      WHERE ef.quantidade < ie.estoque_minimo
      ORDER BY f.nome, ie.descricao;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err: any) {
    console.error('[ESTOQUE] Erro ao obter alertas:', err);
    res.status(500).json({ error: err.message });
  }
}; 