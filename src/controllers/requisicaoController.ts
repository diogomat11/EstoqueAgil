import { Request, Response } from 'express';
import { pool } from '../database';
import { registrarAuditoria } from '../utils/auditoria';
import { registrarMovimentacao } from './movimentacaoController';
import { criarNotificacao } from './notificacaoController';

export const criarRequisicao = async (req: Request, res: Response): Promise<void> => {
  const { solicitante_id, departamento, justificativa, itens } = req.body;
  // Itens deve ser um array: [{ item_id: 1, quantidade: 10 }, ...]

  if (!solicitante_id || !itens || !Array.isArray(itens) || itens.length === 0) {
    res.status(400).json({ error: 'Dados inválidos. Forneça solicitante e uma lista de itens.' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Inserir na tabela principal de requisição
    const requisicaoResult = await client.query(
      `INSERT INTO requisicao (solicitante_id, departamento, justificativa, status)
       VALUES ($1, $2, $3, 'AGUARDANDO_ORCAMENTO') RETURNING id`,
      [solicitante_id, departamento, justificativa]
    );
    const requisicaoId = requisicaoResult.rows[0].id;

    // 2. Inserir cada item na tabela requisicao_itens
    const itemInsertPromises = itens.map(item => {
      return client.query(
        `INSERT INTO requisicao_itens (requisicao_id, item_id, quantidade)
         VALUES ($1, $2, $3)`,
        [requisicaoId, item.item_id, item.quantidade]
      );
    });
    await Promise.all(itemInsertPromises);
    
    await client.query('COMMIT');

    res.status(201).json({ id: requisicaoId, message: 'Requisição criada com sucesso!' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const listarRequisicoes = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await pool.query(`
        SELECT 
          r.id,
          r.data_requisicao,
          r.status,
          u.nome as solicitante_nome,
          (SELECT COUNT(*) FROM requisicao_itens ri WHERE ri.requisicao_id = r.id) as total_itens
        FROM requisicao r
        JOIN usuario u ON r.solicitante_id = u.id
        ORDER BY r.data_requisicao DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
};

export const atualizarStatusRequisicao = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  // Pega usuário autenticado do token
  const usuarioAprovador = (req as any).user?.id;

  try {
    // Valide status permitido
    const statusPermitidos = ['APROVADA', 'REPROVADA', 'ORCAMENTO', 'APROVACAO_SUPERVISOR', 'PENDENTE'];
    if (!statusPermitidos.includes(status)) {
      res.status(400).json({ error: 'Status inválido.' });
      return;
    }

    // Atualiza status
    const result = await pool.query(
      'UPDATE requisicao SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Requisição não encontrada.' });
      return;
    }

    // Registrar histórico de aprovação e log de auditoria
    await pool.query(
      'INSERT INTO historico_requisicao (requisicao_id, usuario_id, status) VALUES ($1, $2, $3)',
      [id, usuarioAprovador, status]
    );
    await registrarAuditoria(usuarioAprovador, 'ALTERACAO_STATUS', 'requisicao', Number(id), `Status alterado para ${status}`);

    // Notificar requisitante se aprovado ou reprovado
    if (['APROVADA', 'REPROVADA'].includes(status)) {
      const reqData = await pool.query('SELECT usuario_id FROM requisicao WHERE id = $1', [id]);
      if (reqData && typeof reqData.rowCount === 'number' && reqData.rowCount > 0) {
        await criarNotificacao(reqData.rows[0].usuario_id, `Sua requisição foi ${status === 'APROVADA' ? 'aprovada' : 'reprovada'}.`);
      }
    }

    // Movimentação automática ao aprovar
    if (status === 'APROVADA') {
      // Buscar dados da requisição aprovada
      const reqResult = await pool.query('SELECT * FROM requisicao WHERE id = $1', [id]);
      const reqData = reqResult.rows[0];
      if (reqData) {
        // Chama a função de movimentação para registrar a saída do item
        await registrarMovimentacao({
          body: {
            item_id: reqData.item_id,
            quantidade: reqData.quantidade,
            tipo: 'SAIDA',
            requisicao_id: id
          },
          user: { id: usuarioAprovador }
        } as any, { status: () => ({ json: () => null }) } as any);
      }
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const listarHistoricoRequisicao = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT h.*, u.nome as usuario_nome
       FROM historico_requisicao h
       LEFT JOIN usuario u ON h.usuario_id = u.id
       WHERE h.requisicao_id = $1
       ORDER BY h.data ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getRequisicaoById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      const requisicaoResult = await pool.query('SELECT * FROM requisicao WHERE id = $1', [id]);
      if (requisicaoResult.rows.length === 0) {
        res.status(404).json({ error: 'Requisição não encontrada' });
        return;
      }
      const itensResult = await pool.query(
        `SELECT ri.quantidade, i.id as item_id, i.descricao, i.codigo 
         FROM requisicao_itens ri
         JOIN item_estoque i ON ri.item_id = i.id
         WHERE ri.requisicao_id = $1`,
        [id]
      );
      const response = {
        ...requisicaoResult.rows[0],
        itens: itensResult.rows
      };
      res.json(response);
    } catch (err: any)      {
      res.status(500).json({ error: err.message });
    }
};

export const updateRequisicao = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { filial_id, item_id, quantidade, observacao } = req.body;
  try {
    const result = await pool.query(
      `UPDATE requisicao 
       SET filial_id = $1, item_id = $2, quantidade = $3, observacao = $4 
       WHERE id = $5 AND status = 'PENDENTE'
       RETURNING *`,
      [filial_id, item_id, quantidade, observacao, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Requisição não encontrada ou não pode ser editada' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteRequisicao = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    // Em uma transação para garantir que a requisição e seus itens sejam removidos
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Itens são deletados em cascata por causa do "ON DELETE CASCADE" no DDL
        await client.query('DELETE FROM requisicao WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.status(204).send();
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};
