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

  try {
    const result = await pool.query(
      'UPDATE orcamento SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Orçamento não encontrado.' });
      return;
    }

    // Futuramente, aqui pode entrar lógica de notificação
    // ou de criação automática de pedido de compra ao 'APROVAR'.

    res.status(200).json(result.rows[0]);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getOrcamentos = async (req: Request, res: Response) => {
  try {
    // Adicionar filtros se necessário, por ex: ?status=PENDENTE
    const { status } = req.query;
    let query = `
      SELECT o.*, f.nome as fornecedor_nome, r.id as requisicao_id 
      FROM orcamento o
      JOIN fornecedor f ON o.fornecedor_id = f.id
      JOIN requisicao r ON o.requisicao_id = r.id
    `;
    const params: (string | number)[] = [];

    if (status && typeof status === 'string') {
      params.push(status);
      query += ` WHERE o.status = $${params.length}`;
    }

    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
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
      return res.status(404).json({ error: 'Orçamento não encontrado ou não pode ser excluído.' });
    }
    await registrarAuditoria(usuario_id, 'EXCLUSAO', 'orcamento', Number(id), 'Orçamento excluído');
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Inicia um novo processo de orçamento a partir de uma requisição
export const gerarOrcamentoFromRequisicao = async (req: Request, res: Response): Promise<void> => {
    const { requisicao_id } = req.body;

    if (!requisicao_id) {
        res.status(400).json({ error: 'ID da requisição é obrigatório.' });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verifica se já não existe um orçamento para esta requisição
        const orcamentoExistente = await client.query(
            'SELECT id FROM orcamento WHERE requisicao_id = $1',
            [requisicao_id]
        );

        if (orcamentoExistente.rows.length > 0) {
            res.status(409).json({ error: 'Já existe um orçamento para esta requisição.', orcamento_id: orcamentoExistente.rows[0].id });
            await client.query('ROLLBACK');
            return;
        }

        // 2. Cria o novo orçamento
        const orcamentoResult = await client.query(
            `INSERT INTO orcamento (requisicao_id, status, tipo) 
             VALUES ($1, 'EM_ELABORACAO', 'ORCAMENTO') RETURNING id`,
            [requisicao_id]
        );
        const orcamentoId = orcamentoResult.rows[0].id;
        
        // 3. Altera o status da requisição
        await client.query(
            `UPDATE requisicao SET status = 'EM_ORCAMENTO' WHERE id = $1`,
            [requisicao_id]
        );

        await client.query('COMMIT');

        res.status(201).json({ message: 'Orçamento gerado com sucesso!', orcamento_id: orcamentoId });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// Obter detalhes de um orçamento (cabeçalho e itens a cotar)
export const getOrcamentoParaCotacao = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        // 1. Pega dados do orçamento e da requisição original
        const orcamentoResult = await pool.query(
            'SELECT * FROM orcamento WHERE id = $1',
            [id]
        );
        if (orcamentoResult.rows.length === 0) {
            res.status(404).json({ error: 'Orçamento não encontrado.' });
            return;
        }
        const orcamento = orcamentoResult.rows[0];

        // 2. Pega os itens da requisição original para saber o que cotar
        const itensResult = await pool.query(
            `SELECT ri.item_id, ri.quantidade, i.descricao, i.codigo
             FROM requisicao_itens ri
             JOIN item_estoque i ON ri.item_id = i.id
             WHERE ri.requisicao_id = $1`,
            [orcamento.requisicao_id]
        );
        
        // 3. Pega as cotações já feitas para este orçamento
        const cotacoesResult = await pool.query(
            `SELECT * FROM orcamento_cotacao WHERE orcamento_id = $1`,
            [id]
        );

        res.json({
            ...orcamento,
            itens_a_cotar: itensResult.rows,
            cotacoes_feitas: cotacoesResult.rows
        });

    } catch (err: any) {
        res.status(500).json({ error: err.message });
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
    const { aprovados, reprovados } = req.body; 
    // aprovados: [{ item_id, fornecedor_id, valor_unitario }]
    // reprovados: [{ item_id, justificativa }]

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Obter ID da requisição original
        const orcamento = await client.query('SELECT requisicao_id FROM orcamento WHERE id = $1', [orcamentoId]);
        if (orcamento.rows.length === 0) throw new Error('Orçamento não encontrado');
        const requisicaoOriginalId = orcamento.rows[0].requisicao_id;
        
        // 2. Processar itens aprovados
        for (const item of aprovados) {
            // Marca o item como APROVADO na requisição original
            await client.query(
                `UPDATE requisicao_itens SET status = 'APROVADO' 
                 WHERE requisicao_id = $1 AND item_id = $2`,
                [requisicaoOriginalId, item.item_id]
            );
            // Marca a cotação escolhida como 'selecionado' no orçamento
            await client.query(
                `UPDATE orcamento_cotacao SET selecionado = true 
                 WHERE orcamento_id = $1 AND item_id = $2 AND fornecedor_id = $3`,
                [orcamentoId, item.item_id, item.fornecedor_id]
            );
        }

        // 3. Processar itens reprovados
        if (reprovados && reprovados.length > 0) {
            // Marca itens como REPROVADO na requisição original
            for (const item of reprovados) {
                await client.query(
                    `UPDATE requisicao_itens SET status = 'REPROVADO', justificativa_reprovacao = $1 
                     WHERE requisicao_id = $2 AND item_id = $3`,
                    [item.justificativa, requisicaoOriginalId, item.item_id]
                );
            }

            // Cria uma nova requisição para os itens reprovados
            const requisicaoAntiga = await client.query('SELECT solicitante_id, departamento FROM requisicao WHERE id = $1', [requisicaoOriginalId]);
            const { solicitante_id, departamento } = requisicaoAntiga.rows[0];

            const novaRequisicaoResult = await client.query(
                `INSERT INTO requisicao (solicitante_id, departamento, status, justificativa, requisicao_origem_id)
                 VALUES ($1, $2, 'NAO_APROVADO', 'Itens reprovados da requisição #${requisicaoOriginalId}', $3) RETURNING id`,
                [solicitante_id, departamento, requisicaoOriginalId]
            );
            const novaRequisicaoId = novaRequisicaoResult.rows[0].id;
            
            // Adiciona os itens reprovados na nova requisição
            for (const item of reprovados) {
                const itemOriginal = await client.query('SELECT quantidade FROM requisicao_itens WHERE requisicao_id = $1 AND item_id = $2', [requisicaoOriginalId, item.item_id]);
                await client.query(
                    'INSERT INTO requisicao_itens (requisicao_id, item_id, quantidade) VALUES ($1, $2, $3)',
                    [novaRequisicaoId, item.item_id, itemOriginal.rows[0].quantidade]
                );
            }
             await client.query(`UPDATE orcamento SET status = 'APROVADO_PARCIALMENTE' WHERE id = $1`, [orcamentoId]);
        } else {
             await client.query(`UPDATE orcamento SET status = 'APROVADO_TOTALMENTE' WHERE id = $1`, [orcamentoId]);
        }
        
        // 4. Atualiza o status da requisição original para APROVADA
        await client.query(`UPDATE requisicao SET status = 'APROVADA' WHERE id = $1`, [requisicaoOriginalId]);


        await client.query('COMMIT');
        res.status(200).json({ message: 'Aprovação processada com sucesso!' });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
}; 