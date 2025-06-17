import { Request, Response } from 'express';
import { pool } from '../database';

export const createEmpresa = async (req: Request, res: Response) => {
  const { cnpj, endereco, telefone } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO empresa (cnpj, endereco, telefone) VALUES ($1, $2, $3) RETURNING *',
      [cnpj, endereco, telefone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getEmpresas = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM empresa');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 