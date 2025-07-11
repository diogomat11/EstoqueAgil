import { Request, Response } from 'express';
import { pool } from '../database';
import { registrarAuditoria } from '../utils/auditoria';
import { criarNotificacao } from './notificacaoController';
import { criarDemandaFluxo, moverDemandaEtapa, getResponsavelPorPerfil } from '../services/dsoService';

export const criarRequisicao = async (req: Request, res: Response): Promise<void> => {
  console.log('[LOG] Iniciando criarRequisicao');
  console.log('[LOG] Corpo da requisição (req.body):', JSON.stringify(req.body, null, 2));

  const { solicitante_id, filial_id, departamento, justificativa, itens } = req.body;
  // Itens deve ser um array: [{ item_id: 1, quantidade: 10 }, ...]

  console.log(`[LOG] Dados recebidos: solicitante_id=${solicitante_id}, filial_id=${filial_id}, departamento=${departamento}`);

  if (!solicitante_id || !filial_id || !itens || !Array.isArray(itens) || itens.length === 0) {
    console.error('[ERRO] Validação falhou: Dados de entrada inválidos.');
    res.status(400).json({ error: 'Dados inválidos. Forneça solicitante, filial e uma lista de itens.' });
    return;
  }

  const client = await pool.connect();
  console.log('[LOG] Conexão com o banco de dados obtida.');

  try {
    await client.query('BEGIN');
    console.log('[LOG] Transação iniciada (BEGIN).');

    // 1. Inserir na tabela principal de requisição
    console.log('[LOG] Inserindo na tabela requisicao...');
    const requisicaoResult = await client.query(
      `INSERT INTO requisicao (solicitante_id, filial_id, departamento, justificativa, status)
       VALUES ($1, $2, $3, $4, 'PENDENTE') RETURNING id`,
      [solicitante_id, filial_id, departamento, justificativa]
    );
    const requisicaoId = requisicaoResult.rows[0].id;
    console.log(`[LOG] Requisição principal inserida com sucesso. ID: ${requisicaoId}`);

    // 2. Inserir cada item na tabela requisicao_itens
    console.log(`[LOG] Inserindo ${itens.length} item(ns) na tabela requisicao_itens...`);
    const itemInsertPromises = itens.map(item => {
      console.log(`[LOG] -> Preparando para inserir item_id: ${item.item_id}, quantidade: ${item.quantidade}`);
      return client.query(
        `INSERT INTO requisicao_itens (requisicao_id, item_estoque_id, quantidade)
         VALUES ($1, $2, $3)`,
        [requisicaoId, item.item_id, item.quantidade]
      );
    });
    await Promise.all(itemInsertPromises);
    console.log('[LOG] Todos os itens inseridos com sucesso.');
    
    await client.query('COMMIT');
    console.log('[LOG] Transação concluída (COMMIT).');

    // Cria Demanda inicial (DSO)
    try {
      await criarDemandaFluxo(null, requisicaoId, 'REQUISICAO', solicitante_id);
    } catch(e){
      console.error('[DSO] erro ao criar demanda inicial:',e);
    }

    res.status(201).json({ id: requisicaoId, message: 'Requisição criada com sucesso!' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[ERRO] Ocorreu um erro na transação, executando ROLLBACK.');
    console.error('[ERRO DETALHADO] Erro em criarRequisicao:', err);
    res.status(500).json({ error: 'Falha ao criar requisição.', detail: err.message, code: err.code });
  } finally {
    client.release();
    console.log('[LOG] Conexão com o banco de dados liberada.');
  }
};

export const getRequisicoes = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await pool.query(`
        SELECT 
          r.id,
          r.data_requisicao,
          r.status,
          u.nome as solicitante_nome,
          f.endereco as filial_nome,
          (SELECT COUNT(*) FROM requisicao_itens ri WHERE ri.requisicao_id = r.id) as total_itens
        FROM requisicao r
        LEFT JOIN usuario u ON r.solicitante_id = u.id
        LEFT JOIN filial f ON r.filial_id = f.id
        ORDER BY r.data_requisicao DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      console.error('[DEBUG] Erro em getRequisicoes:', err);
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
    const statusPermitidos = ['APROVADA','REPROVADA','ORCAMENTO','APROVACAO_SUPERVISOR','PENDENTE','AGUARDANDO_COTACAO','AGUARDANDO_APROVACAO','EM_ELABORACAO','PEDIDO','AGUARDANDO_RECEBIMENTO','RECEBIDO'];
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
      const reqData = await pool.query('SELECT solicitante_id FROM requisicao WHERE id = $1', [id]);
      if (reqData && typeof reqData.rowCount === 'number' && reqData.rowCount > 0) {
        await criarNotificacao(
            pool as any, // Usando o pool como um client genérico
            reqData.rows[0].solicitante_id,
            `Atualização da Requisição #${id}`,
            `Sua requisição foi ${status === 'APROVADA' ? 'aprovada' : 'reprovada'}.`,
            `/requisicoes/${id}`
        );
      }
    }

    // === Sincroniza DSO ===
    try {
      const etapa = status === 'AGUARDANDO_COTACAO'          ? 'COTACAO'      :
                    status === 'AGUARDANDO_APROVACAO'        ? 'APROVACAO'    :
                    status === 'PEDIDO' || status === 'AGUARDANDO_RECEBIMENTO' ? 'PEDIDO' :
                    status === 'RECEBIDO'                 ? 'RECEBIMENTO' :
                    status === 'FINALIZADA'                  ? 'CONCLUIDO'    :
                    'REQUISICAO';
      let respId: number | null = null;
      if (etapa === 'COTACAO')        respId = await getResponsavelPorPerfil('ORCAMENTISTA');
      if (etapa === 'APROVACAO')      respId = await getResponsavelPorPerfil('SUPERVISOR');
      if (etapa === 'PEDIDO')         respId = await getResponsavelPorPerfil('COMPRADOR');
      if (etapa === 'RECEBIMENTO')    respId = await getResponsavelPorPerfil('OPERACIONAL');
      await moverDemandaEtapa(Number(id), etapa, respId);
    } catch(e){
      console.error('[DSO] erro sincronizar etapa requisicao', e);
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
      const requisicaoQuery = `
        SELECT 
          r.*, 
          u.nome as solicitante_nome, 
          f.endereco as filial_nome 
        FROM requisicao r
        LEFT JOIN usuario u ON r.solicitante_id = u.id
        LEFT JOIN filial f ON r.filial_id = f.id
        WHERE r.id = $1
      `;
      const requisicaoResult = await pool.query(requisicaoQuery, [id]);
      
      if (requisicaoResult.rows.length === 0) {
        res.status(404).json({ error: 'Requisição não encontrada' });
        return;
      }

      const itensResult = await pool.query(
        `SELECT ri.quantidade, i.id as item_id, i.descricao, i.codigo 
         FROM requisicao_itens ri
         JOIN item_estoque i ON ri.item_estoque_id = i.id
         WHERE ri.requisicao_id = $1`,
        [id]
      );

      const historicoResult = await pool.query(
        `SELECT dh.*, u.nome as usuario_nome
           FROM demanda_historico dh
           LEFT JOIN usuario u ON u.id = dh.usuario_id
           JOIN demanda d ON d.id = dh.demanda_id
          WHERE d.requisicao_id = $1
          ORDER BY dh.data ASC`,
        [id]
      );

      const response = {
        ...requisicaoResult.rows[0],
        itens: itensResult.rows,
        demanda_historico: historicoResult.rows
      };
      
      res.json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
};

export const updateRequisicao = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { filial_id, departamento, justificativa, itens } = req.body;

  if (!filial_id || !itens || !Array.isArray(itens) || itens.length === 0) {
    res.status(400).json({ error: 'Dados inválidos. Forneça filial e uma lista de itens.' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Atualiza a tabela principal de requisição
    await client.query(
      `UPDATE requisicao SET filial_id = $1, departamento = $2, justificativa = $3 
       WHERE id = $4 AND status = 'PENDENTE'`,
      [filial_id, departamento, justificativa, id]
    );

    // 2. Apaga os itens antigos
    await client.query('DELETE FROM requisicao_itens WHERE requisicao_id = $1', [id]);

    // 3. Insere os novos itens
    const itemInsertPromises = itens.map(item => {
      return client.query(
        `INSERT INTO requisicao_itens (requisicao_id, item_estoque_id, quantidade)
         VALUES ($1, $2, $3)`,
        [id, item.item_id, item.quantidade]
      );
    });
    await Promise.all(itemInsertPromises);
    
    await client.query('COMMIT');

    res.status(200).json({ id, message: 'Requisição atualizada com sucesso!' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[DEBUG] Erro em updateRequisicao:', err);
    res.status(500).json({ error: err.message, detail: err.detail });
  } finally {
    client.release();
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

const etapaDest=(s:string)=>{
  if(s==='AGUARDANDO_COTACAO')         return 'COTACAO';
  if(s==='AGUARDANDO_APROVACAO')       return 'APROVACAO';
  if(s==='PEDIDO' || s==='AGUARDANDO_RECEBIMENTO') return 'PEDIDO';
  if(s==='RECEBIDO')                  return 'RECEBIMENTO';
  if(s==='FINALIZADA')                return 'CONCLUIDO';
  return 'REQUISICAO';
};

const perfilResponsavel=async (s:string)=>{
  if(s==='AGUARDANDO_COTACAO')   return getResponsavelPorPerfil('ORCAMENTISTA');
  if(s==='AGUARDANDO_APROVACAO') return getResponsavelPorPerfil('SUPERVISOR');
  if(s==='PEDIDO' || s==='AGUARDANDO_RECEBIMENTO') return getResponsavelPorPerfil('COMPRADOR');
  if(s==='RECEBIDO')             return getResponsavelPorPerfil('OPERACIONAL');
  return null;
};
