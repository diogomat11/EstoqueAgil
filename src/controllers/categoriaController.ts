import { Request, Response } from 'express';
import { pool } from '../database';

export const createCategoria = async (req: Request, res: Response): Promise<void> => {
  const { descricao } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO categorias (descricao) VALUES ($1) RETURNING *',
      [descricao]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getCategorias = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[DEBUG] Recebida requisição para getCategorias. Executando query em "categorias"...');
    const result = await pool.query('SELECT * FROM categorias ORDER BY descricao');
    console.log(`[DEBUG] Query para categorias encontrou ${result.rowCount} linhas.`);
    res.json(result.rows);
  } catch (err: any) {
    console.error('[DEBUG] Erro em getCategorias:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const updateCategoria = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { descricao } = req.body;
  try {
    const result = await pool.query(
      'UPDATE categorias SET descricao = $1 WHERE id = $2 RETURNING *',
      [descricao, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Categoria não encontrada' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCategoria = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM categorias WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Categoria não encontrada' });
    } else {
      res.status(204).send();
    }
  } catch (err: any) {
    // Captura erro de chave estrangeira
    if (err.code === '23503') {
        res.status(400).json({ error: 'Não é possível excluir a categoria, pois ela está associada a um ou mais itens.' });
    } else {
        res.status(500).json({ error: err.message });
    }
  }
}; 