import { Request, Response } from 'express';
import { pool } from '../database';

export const createItem = async (req: Request, res: Response): Promise<void> => {
  const { 
    descricao, tipo_unidade, categoria_id, is_comodato, 
    orcamento_id, fornecedor_id, valor, validade_valor, estoque_atual, estoque_minimo
  } = req.body;
  
  try {
    const codigoResult = await pool.query("SELECT MAX(CAST(codigo AS INTEGER)) as max_code FROM item_estoque");
    const nextCode = (codigoResult.rows[0].max_code || 0) + 1;

    // === Validações de comodato ===
    if (is_comodato && !orcamento_id) {
      res.status(400).json({ error: 'Para itens de comodato, orcamento_id é obrigatório. Cadastre ou selecione uma negociação antes.' });
      return;
    }

    if (is_comodato && orcamento_id) {
      // Verifica se o orçamento existe, é do tipo NEGOCIACAO e está ativo
      const { rows: orcRows } = await pool.query(
        `SELECT status, tipo FROM orcamento WHERE id = $1`,
        [orcamento_id]
      );
      if (orcRows.length === 0 || orcRows[0].tipo !== 'NEGOCIACAO') {
        res.status(400).json({ error: 'orcamento_id fornecido não é uma negociação válida.' });
        return;
      }
      const statusAtivo = ['AGUARDANDO_ENVIO','PEDIDO_REALIZADO','RECEBIDO'];
      if (!statusAtivo.includes(orcRows[0].status)) {
        res.status(400).json({ error: 'A negociação indicada não está ativa.' });
        return;
      }
    }

    const result = await pool.query(
      `INSERT INTO item_estoque 
       (codigo, descricao, tipo_unid, categoria_id, is_comodato, orcamento_id, fornecedor_id, valor, validade_valor, estoque_atual, estoque_minimo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [String(nextCode), descricao, tipo_unidade, categoria_id, is_comodato, orcamento_id, fornecedor_id, valor, validade_valor, estoque_atual, estoque_minimo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("Erro ao criar item:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getItens = async (req: Request, res: Response): Promise<void> => {
  try {
    // Consulta simplificada para teste
    const query = `
      SELECT ie.*, 
             c.descricao AS categoria_nome,
             f.nome      AS fornecedor_nome
      FROM item_estoque ie
      LEFT JOIN categorias c   ON c.id = ie.categoria_id
      LEFT JOIN fornecedor f  ON f.id = ie.fornecedor_id
      ORDER BY ie.descricao;
    `;
    const result = await pool.query(query);
    console.log(`[DEBUG] Itens encontrados no banco: ${result.rowCount}`); // Adicionando log para depuração
    res.json(result.rows);
  } catch (err: any) {
    console.error('Erro ao buscar itens:', err);
    res.status(500).json({ error: err.message });
  }
};

export const getItemById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM item_estoque WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Item não encontrado' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    descricao, tipo_unidade, categoria_id, is_comodato, 
    orcamento_id, fornecedor_id, valor, validade_valor, estoque_atual, estoque_minimo
  } = req.body;

  try {
    // === Validações de comodato ===
    if (is_comodato && !orcamento_id) {
      res.status(400).json({ error: 'Para itens de comodato, orcamento_id é obrigatório.' });
      return;
    }

    if (is_comodato && orcamento_id) {
      // verifica orçamento válido
      const { rows: orcRows } = await pool.query(`SELECT status, tipo FROM orcamento WHERE id = $1`, [orcamento_id]);
      if (orcRows.length === 0 || orcRows[0].tipo !== 'NEGOCIACAO') {
        res.status(400).json({ error: 'orcamento_id fornecido não é uma negociação válida.' });
        return;
      }
      const ativos = ['AGUARDANDO_ENVIO','PEDIDO_REALIZADO','RECEBIDO'];
      if (!ativos.includes(orcRows[0].status)) {
        res.status(400).json({ error: 'A negociação indicada não está ativa.' });
        return;
      }
    }

    const result = await pool.query(
      `UPDATE item_estoque SET 
       descricao = $1, tipo_unid = $2, categoria_id = $3, is_comodato = $4, 
       orcamento_id = $5, fornecedor_id = $6, valor = $7, validade_valor = $8, 
       estoque_atual = $9, estoque_minimo = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [descricao, tipo_unidade, categoria_id, is_comodato, orcamento_id, fornecedor_id, valor, validade_valor, estoque_atual, estoque_minimo, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Item não encontrado' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err: any) {
    console.error("Erro ao atualizar item:", err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteItem = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM item_estoque WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Item não encontrado' });
    } else {
      res.status(204).send();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 