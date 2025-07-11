import { Request, Response } from 'express';
import { pool } from '../database';

// A) Saldo atual de estoque
export const saldoEstoque = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT codigo, descricao, estoque_atual, estoque_minimo,
        CASE WHEN estoque_atual < estoque_minimo THEN true ELSE false END AS abaixo_minimo
       FROM item_estoque
       ORDER BY descricao`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// B) Itens mais movimentados
export const itensMaisMovimentados = async (req: Request, res: Response) => {
  const { periodo } = req.query; // em dias
  try {
    const result = await pool.query(
      `SELECT i.codigo, i.descricao,
        SUM(CASE WHEN me.tipo = 'SAIDA' THEN mi.quantidade_movimentada ELSE 0 END) AS total_saida,
        SUM(CASE WHEN me.tipo = 'ENTRADA' THEN mi.quantidade_movimentada ELSE 0 END) AS total_entrada
       FROM movimentacao_estoque_item mi
       JOIN movimentacao_estoque me ON me.id = mi.movimentacao_id
       JOIN item_estoque i ON mi.item_estoque_id = i.id
       WHERE me.data_movimentacao >= NOW() - INTERVAL '${periodo || 30} days'
       GROUP BY i.codigo, i.descricao
       ORDER BY total_saida DESC
       LIMIT 10`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// C) Requisições por status
export const requisicoesPorStatus = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*) as quantidade
       FROM requisicao
       GROUP BY status
       ORDER BY quantidade DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// D) Requisições por usuário
export const requisicoesPorUsuario = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.nome, COUNT(r.id) as quantidade
       FROM requisicao r
       JOIN usuario u ON r.usuario_id = u.id
       GROUP BY u.nome
       ORDER BY quantidade DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// E) Orçamentos por status
export const orcamentosPorStatus = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*) as quantidade, SUM(valor) as valor_total
       FROM orcamento
       GROUP BY status
       ORDER BY quantidade DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// F) Orçamentos por fornecedor
export const orcamentosPorFornecedor = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT f.nome as fornecedor, COUNT(o.id) as quantidade, SUM(o.valor) as valor_total
       FROM orcamento o
       JOIN fornecedor f ON o.fornecedor_id = f.id
       GROUP BY f.nome
       ORDER BY valor_total DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// G) Orçamentos por período (data de criação)
export const orcamentosPorPeriodo = async (req: Request, res: Response) => {
  const { inicio, fim } = req.query;
  try {
    const result = await pool.query(
      `SELECT DATE(criado_em) as data, COUNT(*) as quantidade, SUM(valor) as valor_total
       FROM orcamento
       WHERE criado_em >= $1 AND criado_em <= $2
       GROUP BY DATE(criado_em)
       ORDER BY data ASC`,
      [inicio, fim]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getKanbanCompras = async (req: Request, res: Response) => {
  try {
    const query = `
      WITH d AS (
        SELECT d.requisicao_id, d.etapa, d.status,
               r.data_requisicao AS data, dr.usuario_id, u.nome as responsavel
          FROM demanda d
          JOIN requisicao r ON r.id = d.requisicao_id
          LEFT JOIN demanda_responsavel dr ON dr.demanda_id = d.id
          LEFT JOIN usuario u ON u.id = dr.usuario_id
         WHERE d.status = 'EM_ANDAMENTO'
      )
      SELECT requisicao_id as id,
             etapa       as tipo,
             status,
             data,
             responsavel
        FROM d
        ORDER BY data DESC`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch(err:any){
    console.error('[KANBAN] erro:',err);
    res.status(500).json({error:err.message});
  }
}; 