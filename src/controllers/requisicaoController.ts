import { Request, Response } from 'express';
import { pool } from '../database';
import { registrarAuditoria } from '../utils/auditoria';
import { registrarMovimentacao } from './movimentacaoController';
import { criarNotificacao } from './notificacaoController';

export const criarRequisicao = async (req: Request, res: Response): Promise<void> => {
  const { filial_id, item_id, usuario_id, quantidade, observacao } = req.body;

  try {
    // Busca o tipo do item
    const itemResult = await pool.query(
      'SELECT tipo_fornecedor_id FROM item_estoque WHERE id = $1',
      [item_id]
    );
    if (itemResult.rowCount === 0) {
      res.status(404).json({ error: 'Item não encontrado' });
      return;
    }
    const tipoFornecedorId = itemResult.rows[0].tipo_fornecedor_id;

    // Busca o nome do tipo
    const tipoResult = await pool.query(
      'SELECT nome FROM tipo_fornecedor WHERE id = $1',
      [tipoFornecedorId]
    );
    const tipoNome = tipoResult.rows[0].nome;

    // Define status inicial conforme regra de negócio
    let status = 'PENDENTE';
    if (tipoNome === 'COMODATO' || tipoNome === 'SUPERMERCADO') {
      status = 'APROVACAO_SUPERVISOR';
    } else {
      status = 'ORCAMENTO';
    }

    // Insere a requisição
    const result = await pool.query(
      `INSERT INTO requisicao (filial_id, item_id, usuario_id, quantidade, observacao, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [filial_id, item_id, usuario_id, quantidade, observacao, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const listarRequisicoes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, usuario_id, filial_id } = req.query;
    let query = 'SELECT * FROM requisicao WHERE 1=1';
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (usuario_id) {
      params.push(usuario_id);
      query += ` AND usuario_id = $${params.length}`;
    }
    if (filial_id) {
      params.push(filial_id);
      query += ` AND filial_id = $${params.length}`;
    }

    const result = await pool.query(query, params);
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
