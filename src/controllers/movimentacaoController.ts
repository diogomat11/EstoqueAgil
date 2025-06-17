import { Request, Response } from 'express';
import { pool } from '../database';

export const registrarMovimentacao = async (req: Request, res: Response): Promise<void> => {
  const { item_id, quantidade, tipo, requisicao_id } = req.body;
  const usuario_id = (req as any).user?.id;

  if (!item_id || !quantidade || !tipo) {
    res.status(400).json({ error: 'Campos obrigatórios: item_id, quantidade, tipo.' });
    return;
  }

  if (!['ENTRADA', 'SAIDA'].includes(tipo)) {
    res.status(400).json({ error: 'Tipo deve ser ENTRADA ou SAIDA.' });
    return;
  }

  try {
    // Atualiza o saldo do item
    const op = tipo === 'ENTRADA' ? '+' : '-';
    await pool.query(
      `UPDATE item_estoque SET estoque_atual = COALESCE(estoque_atual,0) ${op} $1 WHERE id = $2`,
      [quantidade, item_id]
    );

    // Registra a movimentação
    const result = await pool.query(
      `INSERT INTO movimentacao (item_id, usuario_id, quantidade, tipo, requisicao_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [item_id, usuario_id, quantidade, tipo, requisicao_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const listarMovimentacoes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { item_id, usuario_id, tipo, data_inicio, data_fim } = req.query;
    let query = `SELECT m.*, i.descricao as item_descricao, u.nome as usuario_nome
                 FROM movimentacao m
                 LEFT JOIN item_estoque i ON m.item_id = i.id
                 LEFT JOIN usuario u ON m.usuario_id = u.id
                 WHERE 1=1`;
    const params: any[] = [];

    if (item_id) {
      params.push(item_id);
      query += ` AND m.item_id = $${params.length}`;
    }
    if (usuario_id) {
      params.push(usuario_id);
      query += ` AND m.usuario_id = $${params.length}`;
    }
    if (tipo) {
      params.push(tipo);
      query += ` AND m.tipo = $${params.length}`;
    }
    if (data_inicio) {
      params.push(data_inicio);
      query += ` AND m.data >= $${params.length}`;
    }
    if (data_fim) {
      params.push(data_fim);
      query += ` AND m.data <= $${params.length}`;
    }

    query += ' ORDER BY m.data DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 