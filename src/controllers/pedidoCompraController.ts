import { Request, Response } from 'express';
import { pool } from '../database';
import { registrarAuditoria } from '../utils/auditoria';
import { registrarMovimentacao } from './movimentacaoController';
import { criarNotificacao } from './notificacaoController';

// Gerar pedido de compra a partir de orçamento aprovado
export const gerarPedidoCompra = async (req: Request, res: Response) => {
  const { orcamento_id, observacao } = req.body;
  const usuario_id = (req as any).user?.id;
  if (!orcamento_id) {
    res.status(400).json({ error: 'orcamento_id é obrigatório.' });
    return;
  }
  try {
    // Verifica se orçamento está aprovado
    const orcamento = await pool.query('SELECT * FROM orcamento WHERE id = $1 AND status = $2', [orcamento_id, 'APROVADO']);
    if (orcamento && typeof orcamento.rowCount === 'number' && orcamento.rowCount === 0) {
      res.status(400).json({ error: 'Orçamento não aprovado.' });
      return;
    }
    // Cria pedido
    const result = await pool.query(
      `INSERT INTO pedido_compra (orcamento_id, usuario_id, status, observacao)
       VALUES ($1, $2, 'GERADO', $3) RETURNING *`,
      [orcamento_id, usuario_id, observacao]
    );
    // Notificar requisitante
    const orcamentoData = orcamento.rows[0];
    const reqResult = await pool.query('SELECT usuario_id FROM requisicao WHERE id = $1', [orcamentoData.requisicao_id]);
    if (reqResult && typeof reqResult.rowCount === 'number' && reqResult.rowCount > 0) {
      await criarNotificacao(reqResult.rows[0].usuario_id, 'Um pedido de compra foi gerado para sua requisição.');
    }
    await registrarAuditoria(usuario_id, 'CRIACAO', 'pedido_compra', result.rows[0].id, 'Pedido de compra gerado');
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Listar pedidos de compra
export const listarPedidosCompra = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT p.*, o.valor, f.nome as fornecedor, o.requisicao_id
       FROM pedido_compra p
       JOIN orcamento o ON p.orcamento_id = o.id
       JOIN fornecedor f ON o.fornecedor_id = f.id
       ORDER BY p.data_geracao DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Atualizar status do pedido de compra
export const atualizarStatusPedidoCompra = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // RECEBIDO ou CANCELADO
  const usuario_id = (req as any).user?.id;
  if (!['RECEBIDO', 'CANCELADO'].includes(status)) {
    res.status(400).json({ error: 'Status inválido.' });
    return;
  }
  try {
    let query = 'UPDATE pedido_compra SET status = $1';
    const params: any[] = [status, id];
    if (status === 'RECEBIDO') {
      query += ', data_recebimento = NOW()';
    }
    query += ' WHERE id = $2 RETURNING *';
    const result = await pool.query(query, params);
    if (result && typeof result.rowCount === 'number' && result.rowCount === 0) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }
    await registrarAuditoria(usuario_id, 'ALTERACAO_STATUS', 'pedido_compra', Number(id), `Status alterado para ${status}`);
    if (status === 'RECEBIDO') {
      // Buscar dados do item vinculado ao pedido
      const pedido = result.rows[0];
      const orcamento = await pool.query('SELECT * FROM orcamento WHERE id = $1', [pedido.orcamento_id]);
      if (orcamento && typeof orcamento.rowCount === 'number' && orcamento.rowCount > 0) {
        const req = await pool.query('SELECT * FROM requisicao WHERE id = $1', [orcamento.rows[0].requisicao_id]);
        if (req && typeof req.rowCount === 'number' && req.rowCount > 0) {
          // Registrar movimentação de entrada
          await registrarMovimentacao({
            body: {
              item_id: req.rows[0].item_id,
              quantidade: req.rows[0].quantidade,
              tipo: 'ENTRADA',
              pedido_compra_id: pedido.id
            },
            user: { id: usuario_id }
          } as any, { status: () => ({ json: () => null }) } as any);
          // Notificar requisitante
          await criarNotificacao(req.rows[0].usuario_id, 'Seu pedido de compra foi recebido e o estoque atualizado.');
        }
      }
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 