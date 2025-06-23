import { Request, Response } from 'express';
import { pool } from '../database';
import { registrarAuditoria } from '../utils/auditoria';

export const listarAuditoria = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.nome as usuario_nome
       FROM auditoria a
       LEFT JOIN usuario u ON a.usuario_id = u.id
       ORDER BY a.data DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const resolverDivergenciaItem = async (req: Request, res: Response): Promise<void> => {
    const { movimentacao_item_id } = req.params;
    const { aprovado, justificativa } = req.body; // aprovado: boolean
    const auditorId = (req as any).user?.id;
    const logPrefix = `[AUDITORIA_ITEM_${movimentacao_item_id}]`;

    if (aprovado === undefined || (aprovado === false && !justificativa)) {
        res.status(400).json({ error: "O campo 'aprovado' é obrigatório. A 'justificativa' é obrigatória em caso de rejeição." });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        console.log(`${logPrefix} Usuário ${auditorId} iniciando auditoria.`);

        const itemResult = await client.query(
            "SELECT * FROM movimentacao_estoque_item WHERE id = $1 FOR UPDATE",
            [movimentacao_item_id]
        );
        if (itemResult.rows.length === 0) throw new Error("Item de movimentação não encontrado.");
        
        const item = itemResult.rows[0];
        if (item.status !== 'PENDENTE_AUDITORIA') throw new Error("Este item não está mais pendente de auditoria.");

        const novoStatusAuditoria = aprovado ? 'APROVADA' : 'REJEITADA';
        await client.query(
            `UPDATE auditoria_divergencia 
             SET status = $1, justificativa_auditoria = $2, usuario_auditoria_id = $3, data_auditoria = CURRENT_TIMESTAMP
             WHERE movimentacao_item_id = $4`,
            [novoStatusAuditoria, justificativa, auditorId, movimentacao_item_id]
        );
        console.log(`${logPrefix} Divergência atualizada para ${novoStatusAuditoria}.`);

        if (aprovado) {
            const qtdMovimentadaInt = Math.round(Number(item.quantidade_movimentada));
            await client.query(
                "UPDATE item_estoque SET estoque_atual = estoque_atual + $1 WHERE id = $2",
                [qtdMovimentadaInt, item.item_estoque_id]
            );
            console.log(`${logPrefix} Estoque do item ${item.item_estoque_id} atualizado.`);
        }

        await client.query(
            "UPDATE movimentacao_estoque_item SET status = 'CONCLUIDO' WHERE id = $1",
            [movimentacao_item_id]
        );

        const pendingItemsResult = await client.query(
            "SELECT 1 FROM movimentacao_estoque_item WHERE movimentacao_id = $1 AND status = 'PENDENTE_AUDITORIA'",
            [item.movimentacao_id]
        );

        if (pendingItemsResult.rows.length === 0) {
            await client.query(
                "UPDATE movimentacao_estoque SET status = 'CONCLUIDA' WHERE id = $1",
                [item.movimentacao_id]
            );
            const pedidoResult = await client.query("SELECT pedido_compra_id FROM movimentacao_estoque WHERE id = $1", [item.movimentacao_id]);
            if (pedidoResult.rows.length > 0) {
                await client.query("UPDATE orcamento SET status = 'FINALIZADO' WHERE id = $1", [pedidoResult.rows[0].pedido_compra_id]);
            }
            console.log(`${logPrefix} Todos os itens auditados. Movimentação ${item.movimentacao_id} e pedido atualizados para concluídos.`);
        }
        
        await client.query('COMMIT');
        
        await registrarAuditoria(auditorId, 'AUDITORIA_ITEM_ESTOQUE', 'movimentacao_estoque_item', Number(movimentacao_item_id), `Auditoria do item foi ${novoStatusAuditoria}.`);
        res.status(200).json({ message: `Item ${aprovado ? 'aprovado e adicionado ao estoque' : 'rejeitado'}.` });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`${logPrefix} ERRO FATAL! Transação revertida.`, error);
        res.status(500).json({ error: 'Falha ao processar a auditoria do item.', details: error.message });
    } finally {
        client.release();
    }
}; 