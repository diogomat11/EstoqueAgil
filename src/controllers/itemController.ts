import { Request, Response } from 'express';
import { pool } from '../database';

export const createItem = async (req: Request, res: Response): Promise<void> => {
  const { 
    descricao, unidade_medida, categoria_id, tipo_item,
    is_comodato, orcamento_id, fornecedor_id, valor, validade_valor
  } = req.body;
  
  try {
    const codigoResult = await pool.query("SELECT MAX(codigo) as max_code FROM item_estoque");
    const nextCode = (codigoResult.rows[0].max_code || 0) + 1;

    const result = await pool.query(
      `INSERT INTO item_estoque 
       (codigo, descricao, unidade_medida, categoria_id, tipo_item, is_comodato, orcamento_id, fornecedor_id, valor, validade_valor) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [nextCode, descricao, unidade_medida, categoria_id, tipo_item, is_comodato, orcamento_id, fornecedor_id, valor, validade_valor]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getItens = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        ie.*, 
        c.descricao as categoria_nome,
        f.nome as fornecedor_nome
      FROM 
        item_estoque ie
      LEFT JOIN 
        categoria c ON ie.categoria_id = c.id
      LEFT JOIN 
        fornecedor f ON ie.fornecedor_id = f.id
      ORDER BY 
        ie.descricao;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Erro ao buscar itens:', err);
    res.status(500).json({ error: err.message });
  }
};

export const getItemById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM item WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    descricao, unidade_medida, categoria_id, tipo_item,
    is_comodato, orcamento_id, fornecedor_id, valor, validade_valor
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE item_estoque SET 
       descricao = $1, unidade_medida = $2, categoria_id = $3, tipo_item = $4, is_comodato = $5, 
       orcamento_id = $6, fornecedor_id = $7, valor = $8, validade_valor = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [descricao, unidade_medida, categoria_id, tipo_item, is_comodato, orcamento_id, fornecedor_id, valor, validade_valor, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Item não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM item WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 