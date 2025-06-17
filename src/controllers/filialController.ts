import { Request, Response } from 'express';
import { pool } from '../database';

export const createFilial = async (req: Request, res: Response) => {
  const { cnpj, endereco, telefone, empresa_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO filial (cnpj, endereco, telefone, empresa_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [cnpj, endereco, telefone, empresa_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getFiliais = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM filial');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 