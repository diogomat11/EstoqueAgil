import { Request, Response } from 'express';
import { pool } from '../database';
import { registrarAuditoria } from '../utils/auditoria';
import { criarNotificacao } from './notificacaoController';

// Cadastrar orçamento para uma requisição
export const criarOrcamento = async (req: Request, res: Response) => {
  const { requisicao_id, fornecedor_id, valor, validade, observacao } = req.body;
  const usuario_id = (req as any).user?.id;
  if (!requisicao_id || !fornecedor_id || !valor) {
    res.status(400).json({ error: 'Campos obrigatórios: requisicao_id, fornecedor_id, valor.' });
    return;
  }
  try {
    const result = await pool.query(
      `INSERT INTO orcamento (requisicao_id, fornecedor_id, valor, validade, observacao, usuario_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDENTE') RETURNING *`,
      [requisicao_id, fornecedor_id, valor, validade, observacao, usuario_id]
    );
    await registrarAuditoria(usuario_id, 'CRIACAO', 'orcamento', result.rows[0].id, 'Orçamento criado');
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Listar orçamentos de uma requisição
export const listarOrcamentosPorRequisicao = async (req: Request, res: Response) => {
  const { requisicao_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT o.*, f.nome as fornecedor_nome FROM orcamento o
       JOIN fornecedor f ON o.fornecedor_id = f.id
       WHERE o.requisicao_id = $1
       ORDER BY o.valor ASC`,
      [requisicao_id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Aprovar ou reprovar orçamento
export const atualizarStatusOrcamento = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'APROVADO' ou 'REPROVADO'
  const usuario_id = (req as any).user?.id;
  if (!['APROVADO', 'REPROVADO'].includes(status)) {
    res.status(400).json({ error: 'Status inválido.' });
    return;
  }
  try {
    // Atualiza status do orçamento
    const result = await pool.query(
      'UPDATE orcamento SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Orçamento não encontrado.' });
      return;
    }
    // Registrar histórico
    await pool.query(
      'INSERT INTO historico_orcamento (orcamento_id, usuario_id, status) VALUES ($1, $2, $3)',
      [id, usuario_id, status]
    );
    // Notificar requisitante
    const orcamentoData = result.rows[0];
    const reqResult = await pool.query('SELECT usuario_id FROM requisicao WHERE id = $1', [orcamentoData.requisicao_id]);
    if (reqResult && typeof reqResult.rowCount === 'number' && reqResult.rowCount > 0) {
      const requisitanteId = reqResult.rows[0].usuario_id;
      await criarNotificacao(requisitanteId, `Seu orçamento foi ${status === 'APROVADO' ? 'aprovado' : 'reprovado'}.`);
    }
    // Atualiza status da requisição se aprovado
    if (status === 'APROVADO') {
      await pool.query(
        'UPDATE requisicao SET status = $1 WHERE id = $2',
        ['APROVADA', result.rows[0].requisicao_id]
      );
    }
    await registrarAuditoria(usuario_id, 'ALTERACAO_STATUS', 'orcamento', Number(id), `Status alterado para ${status}`);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 