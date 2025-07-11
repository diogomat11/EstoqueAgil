import { Request, Response } from 'express';
import { pool } from '../database';

// Lista contas a pagar (opcional filtro status)
export const listarContasPagar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    const params: (string | number)[] = [];
    let query = `SELECT cp.id,
                        cp.requisicao_id,
                        cp.pedido_id,
                        cp.fornecedor_id,
                        f.nome AS fornecedor_nome,
                        cp.valor,
                        cp.data_vencimento,
                        cp.status,
                        cp.created_at,
                        cp.updated_at
                 FROM contas_pagar cp
                 LEFT JOIN fornecedor f ON f.id = cp.fornecedor_id`;

    if (status && typeof status === 'string') {
      params.push(status.toUpperCase());
      query += ` WHERE cp.status = $1`;
    }

    query += ' ORDER BY cp.data_vencimento ASC';

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('[Financeiro] listarContasPagar', error);
    res.status(500).json({ error: 'Erro ao listar contas a pagar', detail: error.message });
  }
};

// Quitar uma conta (marcar como PAGO)
export const quitarConta = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE contas_pagar
         SET status = 'PAGO', updated_at = NOW()
       WHERE id = $1 AND status = 'ABERTO'
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Conta não encontrada ou já quitada' });
      return;
    }

    res.status(200).json({ message: 'Conta quitada com sucesso', conta: result.rows[0] });
  } catch (error: any) {
    console.error('[Financeiro] quitarConta', error);
    res.status(500).json({ error: 'Erro ao quitar conta', detail: error.message });
  }
};