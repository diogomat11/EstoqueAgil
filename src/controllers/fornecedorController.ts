import { Request, Response } from 'express';
import { pool } from '../database';

export const createFornecedor = async (req: Request, res: Response) => {
  const { nome, cnpj, nome_contato, telefone, email, pedido_minimo, tipos } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO fornecedor (nome, cnpj, nome_contato, telefone, email, pedido_minimo, tipos) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [nome, cnpj, nome_contato, telefone, email, pedido_minimo, tipos]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getFornecedores = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM fornecedor');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 