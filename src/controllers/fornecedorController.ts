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
    const result = await pool.query('SELECT * FROM fornecedor ORDER BY nome');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getFornecedorById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT * FROM fornecedor WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Fornecedor não encontrado' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
};

export const updateFornecedor = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nome, cnpj, nome_contato, telefone, email, pedido_minimo, tipos } = req.body;
    try {
      const result = await pool.query(
        `UPDATE fornecedor 
         SET nome = $1, cnpj = $2, nome_contato = $3, telefone = $4, email = $5, pedido_minimo = $6, tipos = $7
         WHERE id = $8 
         RETURNING *`,
        [nome, cnpj, nome_contato, telefone, email, pedido_minimo, tipos, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Fornecedor não encontrado' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
};

export const deleteFornecedor = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM fornecedor WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Fornecedor não encontrado' });
      }
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
}; 