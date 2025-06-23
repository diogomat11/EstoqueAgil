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
export const atualizarStatusOrcamento = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidos = [
    'AGUARDANDO_APROVACAO',
    'APROVADO',
    'REPROVADO',
    'VENCIDO',
    'ADQUIRIDO'
  ];

  if (!status || !statusValidos.includes(status)) {
    res.status(400).json({ error: 'Status fornecido é inválido.' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE orcamento SET status = $1 WHERE id = $2 RETURNING requisicao_id',
      [status, id]
    );

    if (result.rows.length === 0) {
      throw new Error('Orçamento não encontrado.');
    }

    const { requisicao_id } = result.rows[0];

    // Se o orçamento foi enviado para aprovação, atualiza a requisição também
    if (status === 'AGUARDANDO_APROVACAO' && requisicao_id) {
        const updateRequisicaoResult = await client.query(
            'UPDATE requisicao SET status = $1 WHERE id = $2',
            ['AGUARDANDO_APROVACAO', requisicao_id]
        );
        if (updateRequisicaoResult.rowCount === 0) {
          throw new Error(`Requisição com ID ${requisicao_id} não encontrada para atualização.`);
        }
    }
    
    await client.query('COMMIT');
    res.status(200).json({ message: 'Status atualizado com sucesso' });

  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const getOrcamentos = async (req: Request, res: Response) => {
  console.log("[LOG] Iniciando getOrcamentos...");
  try {
    // Adicionar filtros se necessário, por ex: ?status=PENDENTE
    const { status } = req.query;
    let query = `
      SELECT 
        o.id,
        o.requisicao_id,
        o.status,
        o.tipo,
        o.data
      FROM orcamento o
    `;
    const params: (string | number)[] = [];

    if (status && typeof status === 'string') {
      params.push(status);
      query += ` WHERE o.status = $${params.length}`;
    }

    query += ' ORDER BY o.data DESC';

    console.log("[LOG] Executando query para listar orçamentos:", query);
    const result = await pool.query(query, params);
    console.log(`[LOG] ${result.rowCount} orçamentos encontrados.`);
    res.json(result.rows);
  } catch (err: any) {
    console.error("[ERRO] Falha em getOrcamentos:", err);
    res.status(500).json({ error: err.message });
  }
};

export const updateOrcamento = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fornecedor_id, valor, validade, observacao } = req.body;
  const usuario_id = (req as any).user?.id;

  try {
    const result = await pool.query(
      `UPDATE orcamento 
       SET fornecedor_id = $1, valor = $2, validade = $3, observacao = $4 
       WHERE id = $5 AND status = 'PENDENTE'
       RETURNING *`,
      [fornecedor_id, valor, validade, observacao, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado ou não pode ser editado.' });
    }
    await registrarAuditoria(usuario_id, 'ATUALIZACAO', 'orcamento', Number(id), 'Orçamento atualizado');
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteOrcamento = async (req: Request, res: Response) => {
  const { id } = req.params;
  const usuario_id = (req as any).user?.id;

  try {
    const result = await pool.query(
      `DELETE FROM orcamento 
       WHERE id = $1 AND status = 'PENDENTE' 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Orçamento não encontrado ou não pode ser excluído.' });
      return;
    }
    await registrarAuditoria(usuario_id, 'EXCLUSAO', 'orcamento', Number(id), 'Orçamento excluído');
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Inicia um novo processo de orçamento a partir de uma requisição
export const gerarOrcamentoFromRequisicao = async (req: Request, res: Response): Promise<void> => {
    console.log('[LOG] Iniciando gerarOrcamentoFromRequisicao');
    console.log('[LOG] Corpo da requisição (req.body):', JSON.stringify(req.body, null, 2));
    const { requisicao_id } = req.body;

    if (!requisicao_id) {
        console.error('[ERRO] ID da requisição não foi fornecido.');
        res.status(400).json({ error: 'ID da requisição é obrigatório.' });
        return;
    }

    const client = await pool.connect();
    console.log(`[LOG] Conexão com o banco de dados obtida para requisição ${requisicao_id}.`);
    try {
        await client.query('BEGIN');
        console.log('[LOG] Transação iniciada.');

        // 1. Verifica se já não existe um orçamento para esta requisição
        console.log(`[LOG] Verificando se já existe orçamento para a requisição ${requisicao_id}...`);
        const orcamentoExistente = await client.query(
            'SELECT id FROM orcamento WHERE requisicao_id = $1',
            [requisicao_id]
        );

        if (orcamentoExistente.rows.length > 0) {
            const orcamentoId = orcamentoExistente.rows[0].id;
            console.log(`[LOG] Orçamento ${orcamentoId} já existe para esta requisição. Retornando ID.`);
            // Se já existe, apenas retorna o ID do orçamento existente.
            await client.query('ROLLBACK'); // Não há necessidade de manter a transação
            res.status(200).json({ orcamento_id: orcamentoId });
            return;
        }
        
        console.log('[LOG] Nenhum orçamento existente encontrado. Criando um novo...');
        // 2. Cria o novo orçamento
        const orcamentoResult = await client.query(
            `INSERT INTO orcamento (requisicao_id, status, tipo) 
             VALUES ($1, 'EM_ELABORACAO', 'ORCAMENTO') RETURNING id`,
            [requisicao_id]
        );
        const orcamentoId = orcamentoResult.rows[0].id;
        console.log(`[LOG] Novo orçamento criado com ID: ${orcamentoId}`);
        
        // 3. Altera o status da requisição
        console.log(`[LOG] Atualizando status da requisição ${requisicao_id} para 'AGUARDANDO_COTACAO'...`);
        await client.query(
            `UPDATE requisicao SET status = 'AGUARDANDO_COTACAO' WHERE id = $1`,
            [requisicao_id]
        );
        console.log('[LOG] Status da requisição atualizado.');

        await client.query('COMMIT');
        console.log('[LOG] Transação concluída (COMMIT).');

        res.status(201).json({ message: 'Orçamento gerado com sucesso!', orcamento_id: orcamentoId });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('[ERRO] Ocorreu um erro na transação, executando ROLLBACK.');
        console.error('[ERRO DETALHADO] Erro em gerarOrcamentoFromRequisicao:', err);
        res.status(500).json({ error: err.message, detail: err.detail });
    } finally {
        client.release();
        console.log('[LOG] Conexão com o banco de dados liberada.');
    }
};

// Obter detalhes de um orçamento (cabeçalho e itens a cotar)
export const getOrcamentoParaCotacao = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        // 1. Pega dados do orçamento e da requisição original
        const orcamentoResult = await pool.query(
            `SELECT o.id, o.status, o.requisicao_id, r.status as requisicao_status
             FROM orcamento o
             JOIN requisicao r ON o.requisicao_id = r.id
             WHERE o.id = $1`,
            [id]
        );

        if (orcamentoResult.rows.length === 0) {
            res.status(404).json({ error: 'Orçamento não encontrado.' });
            return;
        }
        const orcamento = orcamentoResult.rows[0];

        // 2. Pega os itens da requisição, já calculando o vencedor de cada um
        const itensQuery = `
            WITH cotacoes_com_rank AS (
                SELECT
                    oc.item_id,
                    oc.fornecedor_id,
                    oc.valor_unitario,
                    ROW_NUMBER() OVER(PARTITION BY oc.item_id ORDER BY oc.valor_unitario ASC) as rank
                FROM orcamento_cotacao oc
                WHERE oc.orcamento_id = $1 AND oc.valor_unitario IS NOT NULL
            )
            SELECT
                ri.item_estoque_id AS item_id,
                ri.quantidade,
                i.descricao,
                i.codigo,
                cr.fornecedor_id AS vencedor_fornecedor_id,
                cr.valor_unitario AS vencedor_valor_unitario
            FROM requisicao_itens ri
            JOIN item_estoque i ON ri.item_estoque_id = i.id
            LEFT JOIN cotacoes_com_rank cr ON ri.item_estoque_id = cr.item_id AND cr.rank = 1
            WHERE ri.requisicao_id = $2;
        `;
        const itensResult = await pool.query(itensQuery, [id, orcamento.requisicao_id]);

        // 3. Pega as cotações já feitas para este orçamento
        const cotacoesResult = await pool.query(
            `SELECT item_id, fornecedor_id, valor_unitario
             FROM orcamento_cotacao
             WHERE orcamento_id = $1`,
            [id]
        );

        // 4. Pega os fornecedores que têm cotação neste orçamento
        const fornecedoresResult = await pool.query(
            `SELECT DISTINCT f.id, f.nome, f.pedido_minimo
             FROM fornecedor f
             JOIN orcamento_cotacao c ON f.id = c.fornecedor_id
             WHERE c.orcamento_id = $1`,
            [id]
        );
        
        const responseData = {
            status: orcamento.status,
            itens_a_cotar: itensResult.rows,
            cotacoes_feitas: cotacoesResult.rows,
            fornecedores_cotacao: fornecedoresResult.rows,
        };

        res.json(responseData);

    } catch (err: any) {
        console.error(`Erro ao buscar dados para cotação do orçamento ${id}:`, err);
        res.status(500).json({ error: 'Erro interno ao buscar dados do orçamento.', details: err.message });
    }
};

// Salvar/Atualizar cotações de um orçamento
export const salvarCotacoes = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params; // orcamento_id
    const { cotacoes } = req.body; // [{ item_id, fornecedor_id, valor_unitario }, ...]

    if (!cotacoes || !Array.isArray(cotacoes)) {
        res.status(400).json({ error: 'Formato de cotações inválido.' });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Deleta as cotações antigas para este orçamento para depois inserir as novas
        await client.query('DELETE FROM orcamento_cotacao WHERE orcamento_id = $1', [id]);

        // Insere as novas cotações
        const insertPromises = cotacoes.map(c => {
            return client.query(
                `INSERT INTO orcamento_cotacao (orcamento_id, item_id, fornecedor_id, valor_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [id, c.item_id, c.fornecedor_id, c.valor_unitario]
            );
        });

        await Promise.all(insertPromises);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Cotações salvas com sucesso!' });

    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// ===============================================
// Funções Específicas para Negociações
// ===============================================

// Lista todos os orçamentos que são do tipo 'NEGOCIACAO'
export const getNegociacoes = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            "SELECT * FROM orcamento WHERE tipo = 'NEGOCIACAO' ORDER BY id DESC"
        );
        res.status(200).json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// Cria uma nova negociação (um orçamento do tipo 'NEGOCIACAO' sem requisição)
export const createNegociacao = async (req: Request, res: Response): Promise<void> => {
    const { nome, validade_inicio, validade_fim, status, cotacoes } = req.body;
    // cotacoes = [{ item_id, fornecedor_id, valor_unitario }]

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Cria o registro principal do orçamento/negociação
        const orcamentoResult = await client.query(
            `INSERT INTO orcamento (descricao, tipo, validade_inicio, validade_fim, status)
             VALUES ($1, 'NEGOCIACAO', $2, $3, $4) RETURNING id`,
            [nome, validade_inicio, validade_fim, status || 'APROVADO']
        );
        const orcamentoId = orcamentoResult.rows[0].id;
        
        // 2. Insere as cotações (preços negociados)
        if (cotacoes && cotacoes.length > 0) {
            const insertPromises = cotacoes.map((c: any) => {
                return client.query(
                    `INSERT INTO orcamento_cotacao (orcamento_id, item_id, fornecedor_id, valor_unitario)
                     VALUES ($1, $2, $3, $4)`,
                    [orcamentoId, c.item_id, c.fornecedor_id, c.valor_unitario]
                );
            });
            await Promise.all(insertPromises);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Negociação criada com sucesso!', id: orcamentoId });

    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const processarAprovacao = async (req: Request, res: Response): Promise<void> => {
    const { id: orcamentoId } = req.params;
    const { decisions } = req.body;
    const usuarioId = (req as any).user?.id;
    const logPrefix = `[APROVACAO_ORC_${orcamentoId}]`;

    interface ApprovedItem {
      itemId: number;
      fornecedorId: number;
      quantidade: number;
      valorUnitario: number;
      justificativa: string;
    }

    console.log(`${logPrefix} Iniciando. Usuário: ${usuarioId}.`);
    console.log(`${logPrefix} Decisões recebidas:`, JSON.stringify(decisions, null, 2));

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log(`${logPrefix} Transação iniciada.`);

        // 1. Obter informações de contexto (requisição original e solicitante)
        console.log(`${logPrefix} Etapa 1: Buscando dados de contexto.`);
        const orcamentoRes = await client.query('SELECT requisicao_id FROM orcamento WHERE id = $1', [orcamentoId]);
        if (orcamentoRes.rows.length === 0) throw new Error('Orçamento não encontrado');
        const requisicaoOriginalId = orcamentoRes.rows[0].requisicao_id;
        console.log(`${logPrefix} Requisição original ID: ${requisicaoOriginalId}.`);

        const requisicaoRes = await client.query('SELECT solicitante_id FROM requisicao WHERE id = $1', [requisicaoOriginalId]);
        if (requisicaoRes.rows.length === 0) throw new Error('Requisição original não encontrada');
        const solicitanteOriginalId = requisicaoRes.rows[0].solicitante_id;
        console.log(`${logPrefix} Solicitante original ID: ${solicitanteOriginalId}.`);

        // 2. Separar itens aprovados e reprovados
        console.log(`${logPrefix} Etapa 2: Separando itens.`);
        const approvedItems: ApprovedItem[] = [];
        const rejectedItems: any[] = [];

        for (const itemId in decisions) {
            const decision = decisions[itemId];
            if (decision.status === 'APROVADO') {
                if (!decision.selectedFornecedorId) throw new Error(`Item ${itemId} aprovado sem fornecedor.`);
                if (!decision.valorUnitario || decision.valorUnitario <= 0) throw new Error(`Item ${itemId} aprovado com valor inválido.`);
                approvedItems.push({
                    itemId: parseInt(itemId),
                    fornecedorId: decision.selectedFornecedorId,
                    quantidade: decision.quantidade,
                    valorUnitario: decision.valorUnitario,
                    justificativa: decision.justificativa
                });
            } else if (decision.status === 'REPROVADO') {
                rejectedItems.push({ itemId: parseInt(itemId), justificativa: decision.justificativa });
            }
        }
        console.log(`${logPrefix} Itens Aprovados: ${approvedItems.length}, Reprovados: ${rejectedItems.length}.`);

        // 3. Processar itens aprovados
        console.log(`${logPrefix} Etapa 3: Processando ${approvedItems.length} itens aprovados.`);

        // Agrupa os itens aprovados por fornecedor
        const itensPorFornecedor = approvedItems.reduce((acc, item) => {
            const fornecedorId = item.fornecedorId;
            if (!acc[fornecedorId]) {
                acc[fornecedorId] = [];
            }
            acc[fornecedorId].push(item);
            return acc;
        }, {} as Record<number, ApprovedItem[]>);

        // Para cada fornecedor, cria um Pedido (que é um orçamento do tipo 'PEDIDO')
        for (const fornecedorIdStr of Object.keys(itensPorFornecedor)) {
            const fornecedorId = parseInt(fornecedorIdStr, 10);
            const itensDoFornecedor = itensPorFornecedor[fornecedorId];
            
            // Calcula o valor total para este fornecedor
            const valorTotal = itensDoFornecedor.reduce((soma, item) => soma + (item.quantidade * item.valorUnitario), 0);

            console.log(`${logPrefix} Processando pedido para Fornecedor ID: ${fornecedorId} com ${itensDoFornecedor.length} itens e valor total de R$${valorTotal.toFixed(2)}.`);

            // Insere o novo orçamento do tipo "PEDIDO"
            const novoPedidoQuery = `
                INSERT INTO orcamento (
                    requisicao_id, 
                    id_fornecedor, 
                    valor_total, 
                    aprovador_id, 
                    data_aprovacao, 
                    status, 
                    tipo
                ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'AGUARDANDO_ENVIO', 'PEDIDO')
                RETURNING id;
            `;
            const novoPedidoResult = await client.query(novoPedidoQuery, [
                requisicaoOriginalId,
                fornecedorId,
                valorTotal,
                usuarioId
            ]);
            const novoPedidoId = novoPedidoResult.rows[0].id;
            console.log(`${logPrefix} Novo Pedido (orçamento) criado com ID: ${novoPedidoId} para o fornecedor ${fornecedorId}.`);

            // Insere os itens na tabela 'orcamento_item' para o novo pedido
            for (const item of itensDoFornecedor) {
                const insertItemQuery = `
                    INSERT INTO orcamento_item (orcamento_id, item_estoque_id, quantidade, valor_unitario, status)
                    VALUES ($1, $2, $3, $4, 'APROVADO')
                `;
                const insertItemValues = [novoPedidoId, item.itemId, item.quantidade, item.valorUnitario];
                await client.query(insertItemQuery, insertItemValues);
            }
            console.log(`${logPrefix} ${itensDoFornecedor.length} itens inseridos na tabela orcamento_item para o pedido ${novoPedidoId}.`);
        }
        
        // 4. Processar itens reprovados
        console.log(`${logPrefix} Etapa 4: Processando ${rejectedItems.length} itens reprovados.`);
        let novaRequisicaoId: number | null = null;
        if (rejectedItems.length > 0) {
            const novaReqVals = [`Itens reprovados do orçamento #${orcamentoId}.`, requisicaoOriginalId];
            console.log(`${logPrefix} Criando nova requisição 'REPROVADO' com valores:`, novaReqVals);
            const novaRequisicaoResult = await client.query(
                `INSERT INTO requisicao (solicitante_id, filial_id, status, observacao, tipo)
                 SELECT solicitante_id, filial_id, 'REPROVADO', $1, tipo
                 FROM requisicao WHERE id = $2 RETURNING id`,
                novaReqVals
            );
            
            if (novaRequisicaoResult.rows.length === 0) throw new Error('Falha ao criar requisição para itens reprovados.');
            novaRequisicaoId = novaRequisicaoResult.rows[0].id;
            console.log(`${logPrefix} Nova requisição 'REPROVADO' ID ${novaRequisicaoId} criada.`);

            for (const item of rejectedItems) {
                const itemOriginal = await client.query('SELECT quantidade FROM requisicao_itens WHERE requisicao_id = $1 AND item_estoque_id = $2', [requisicaoOriginalId, item.itemId]);
                const quantidadeOriginal = itemOriginal.rows.length > 0 ? itemOriginal.rows[0].quantidade : 1;
                const itemReprovadoVals = [novaRequisicaoId, item.itemId, quantidadeOriginal, item.justificativa];
                console.log(`${logPrefix} Inserindo item ${item.itemId} na nova requisição ${novaRequisicaoId} com valores:`, itemReprovadoVals);
                await client.query(
                    `INSERT INTO requisicao_itens (requisicao_id, item_estoque_id, quantidade, justificativa_reprovacao)
                     VALUES ($1, $2, $3, $4)`,
                    itemReprovadoVals
                );
            }
        }

        // 5. Atualizar status do orçamento e da requisição original
        console.log(`${logPrefix} Etapa 5: Atualizando status.`);
        const finalOrcamentoStatus = rejectedItems.length > 0 ? 'APROVADO_PARCIALMENTE' : 'APROVADO_TOTALMENTE';
        await client.query('UPDATE orcamento SET status = $1 WHERE id = $2', [finalOrcamentoStatus, orcamentoId]);
        console.log(`${logPrefix} Status do orçamento ${orcamentoId} -> ${finalOrcamentoStatus}`);
        
        // Se há itens aprovados, a requisição foi atendida (total ou parcialmente) e o ciclo se encerra.
        const finalRequisicaoStatus = approvedItems.length > 0 ? 'FINALIZADA' : 'REPROVADA';
        await client.query('UPDATE requisicao SET status = $1 WHERE id = $2', [finalRequisicaoStatus, requisicaoOriginalId]);
        console.log(`${logPrefix} Status da requisição ${requisicaoOriginalId} -> ${finalRequisicaoStatus}.`);


        // 6. Criar notificação
        console.log(`${logPrefix} Etapa 6: Criando notificação.`);
        if (solicitanteOriginalId) {
            await criarNotificacao(
                client,
                solicitanteOriginalId,
                'Resultado da Análise de Orçamento',
                `O orçamento da sua requisição #${requisicaoOriginalId} foi ${finalOrcamentoStatus.replace('_', ' ').toLowerCase()}.`,
                `/requisicoes/${requisicaoOriginalId}`
            );
        }
        
        await client.query('COMMIT');
        console.log(`${logPrefix} Transação concluída com SUCESSO.`);

        res.status(200).json({ message: 'Processo de aprovação finalizado com sucesso!' });

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`${logPrefix} ERRO FATAL! Transação revertida (ROLLBACK).`, err);
        res.status(500).json({ error: 'Falha ao finalizar o processo.', details: err.message });
    } finally {
        client.release();
        console.log(`${logPrefix} Conexão com o banco de dados liberada.`);
    }
}; 