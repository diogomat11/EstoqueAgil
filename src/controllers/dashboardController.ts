import { Request, Response } from 'express';
import { pool } from '../database';

// A) Saldo atual de estoque
export const saldoEstoque = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT codigo, descricao, estoque_atual, estoque_min,
        CASE WHEN estoque_atual < estoque_min THEN true ELSE false END AS abaixo_minimo
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
        SUM(CASE WHEN m.tipo = 'SAIDA' THEN m.quantidade ELSE 0 END) AS total_saida,
        SUM(CASE WHEN m.tipo = 'ENTRADA' THEN m.quantidade ELSE 0 END) AS total_entrada
       FROM movimentacao m
       JOIN item_estoque i ON m.item_id = i.id
       WHERE m.data >= NOW() - INTERVAL '${periodo || 30} days'
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