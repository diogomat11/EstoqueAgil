import { Request, Response } from 'express';
import { pool } from '../database';

export const listarAuditoria = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.nome as usuario_nome
       FROM auditoria a
       LEFT JOIN usuario u ON a.usuario_id = u.id
       ORDER BY a.data DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 