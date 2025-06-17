import { Request, Response } from 'express';
import { pool } from '../database';

export const createItem = async (req: Request, res: Response) => {
  const { codigo, descricao, tipo_unidade, estoque_minimo, estoque_atual, valor, fornecedor_id, validade_negociacao } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO item (codigo, descricao, tipo_unidade, estoque_minimo, estoque_atual, valor, fornecedor_id, validade_negociacao) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [codigo, descricao, tipo_unidade, estoque_minimo, estoque_atual, valor, fornecedor_id, validade_negociacao]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getItens = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM item');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 