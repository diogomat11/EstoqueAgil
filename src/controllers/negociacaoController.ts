import { Request, Response } from 'express';
import { pool } from '../database';

export const createNegociacao = async (req: Request, res: Response) => {
  const { descricao, fornecedor_id, valor, validade, pedido_minimo } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO negociacoes (descricao, fornecedor_id, valor, validade, pedido_minimo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [descricao, fornecedor_id, valor, validade, pedido_minimo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getNegociacoes = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT n.*, f.nome as fornecedor_nome 
      FROM negociacoes n
      JOIN fornecedor f ON n.fornecedor_id = f.id
      ORDER BY n.descricao
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateNegociacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { descricao, fornecedor_id, valor, validade, pedido_minimo } = req.body;
  try {
    const result = await pool.query(
      'UPDATE negociacoes SET descricao = $1, fornecedor_id = $2, valor = $3, validade = $4, pedido_minimo = $5 WHERE id = $6 RETURNING *',
      [descricao, fornecedor_id, valor, validade, pedido_minimo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Negociação não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteNegociacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM negociacoes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Negociação não encontrada' });
    }
    res.status(204).send();
  } catch (err: any) {
    if (err.code === '23503') {
        return res.status(400).json({ error: 'Não é possível excluir a negociação, pois ela está associada a um ou mais itens.' });
    }
    res.status(500).json({ error: err.message });
  }
}; 