import { Request, Response } from 'express';
import { pool } from '../database';
import { registrarAuditoria } from '../utils/auditoria';
import { criarNotificacao } from './notificacaoController';
import { moverDemandaEtapa, getResponsavelPorPerfil } from '../services/dsoService';

// Lista todos os orçamentos que são, na verdade, Pedidos de Compra
export const listarPedidos = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT
                o.id,
                o.status,
                o.valor_total,
                o.data_aprovacao,
                f.nome as nome_fornecedor
            FROM orcamento o
            JOIN fornecedor f ON o.id_fornecedor = f.id
            WHERE o.tipo = 'PEDIDO'
            ORDER BY o.data_aprovacao DESC;
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error: any) {
        console.error("Erro ao listar pedidos:", error);
        res.status(500).json({ error: "Erro interno ao buscar pedidos.", details: error.message });
    }
};

// Busca os detalhes de um único Pedido de Compra
export const getPedidoById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        // 1. Pega os dados do cabeçalho do pedido
        const pedidoQuery = `
            SELECT
                o.id,
                o.status,
                o.valor_total,
                o.data_aprovacao,
                o.requisicao_id,
                f.id as fornecedor_id,
                f.nome as nome_fornecedor,
                u.nome as nome_aprovador
            FROM orcamento o
            JOIN fornecedor f ON o.id_fornecedor = f.id
            LEFT JOIN usuario u ON o.aprovador_id = u.id
            WHERE o.id = $1 AND o.tipo = 'PEDIDO';
        `;
        const pedidoResult = await pool.query(pedidoQuery, [id]);

        if (pedidoResult.rows.length === 0) {
            res.status(404).json({ error: 'Pedido de compra não encontrado.' });
            return;
        }

        // 2. Pega os itens associados a este pedido
        const itensQuery = `
            SELECT
                oi.item_estoque_id,
                oi.quantidade,
                oi.valor_unitario,
                ie.descricao,
                ie.codigo
            FROM orcamento_item oi
            JOIN item_estoque ie ON oi.item_estoque_id = ie.id
            WHERE oi.orcamento_id = $1;
        `;
        const itensResult = await pool.query(itensQuery, [id]);

        const responseData = {
            ...pedidoResult.rows[0],
            itens: itensResult.rows
        };

        res.status(200).json(responseData);

    } catch (error: any) {
        console.error(`Erro ao buscar pedido ${id}:`, error);
        res.status(500).json({ error: "Erro interno ao buscar detalhes do pedido.", details: error.message });
    }
};

// Atualiza o status de um Pedido de Compra
export const atualizarStatusPedido = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
    const { status } = req.body;

    // Validação dos status permitidos para esta rota
    const statusValidos = ['PEDIDO_REALIZADO', 'RECEBIDO', 'FINALIZADO'];
    if (!status || !statusValidos.includes(status)) {
        res.status(400).json({ error: `Status inválido. Status permitidos: ${statusValidos.join(', ')}` });
    return;
  }

    try {
        const updateQuery = `
            UPDATE orcamento
            SET status = $1
            WHERE id = $2 AND tipo = 'PEDIDO'
            RETURNING *;
        `;
        const result = await pool.query(updateQuery, [status, id]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Pedido não encontrado ou não pôde ser atualizado.' });
      return;
        }

        // Após update
        const requisicaoId = result.rows[0].requisicao_id;

        // Manter status da requisição sincronizado
        if(requisicaoId){
          let novoStatusReq: string | undefined;
          if(status === 'PEDIDO_REALIZADO') novoStatusReq = 'AGUARDANDO_RECEBIMENTO';
          else if(status === 'RECEBIDO')    novoStatusReq = 'FINALIZADA';
          else if(status === 'FINALIZADO')  novoStatusReq = 'FINALIZADA';
          if(novoStatusReq){
            await pool.query('UPDATE requisicao SET status=$1 WHERE id=$2', [novoStatusReq, requisicaoId]);
          }
        }

        // Sincroniza DSO de acordo com o novo status do pedido
        try {
          if(status === 'RECEBIDO'){
             const opId = await getResponsavelPorPerfil('OPERACIONAL');
             await moverDemandaEtapa(requisicaoId,'RECEBIMENTO', opId);
          } else if(status === 'FINALIZADO'){
             await moverDemandaEtapa(requisicaoId,'CONCLUIDO', null);
          }
        } catch(e){ console.error('[DSO] mover etapa pedido',e);} 

        // TODO: Adicionar lógica de notificação aqui no futuro, se necessário

        res.status(200).json({ message: 'Status do pedido atualizado com sucesso.', pedido: result.rows[0] });

    } catch (error: any) {
        console.error(`Erro ao atualizar status do pedido ${id}:`, error);
        res.status(500).json({ error: "Erro interno ao atualizar o status do pedido.", details: error.message });
  }
}; 