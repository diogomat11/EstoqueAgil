import { Request, Response } from 'express';
import { pool } from '../database';
import { registrarAuditoria } from '../utils/auditoria';

// Função principal para registrar a entrada de um pedido de compra no estoque
export const registrarEntradaPorPedido = async (req: Request, res: Response): Promise<void> => {
    const { 
        pedido_compra_id, 
        itens_recebidos, 
        observacao,
        nf_numero,
        nf_chave_acesso,
        nf_data_emissao
    } = req.body;
    // itens_recebidos: [{ item_estoque_id: number, quantidade_recebida: number, valor_unitario_recebido: number, quantidade_pedida: number, valor_unitario_pedido: number }]
    const usuario_id = (req as any).user?.id;
    const logPrefix = `[ENTRADA_PEDIDO_${pedido_compra_id}]`;

    if (!pedido_compra_id || !itens_recebidos || !Array.isArray(itens_recebidos) || itens_recebidos.length === 0) {
        res.status(400).json({ error: 'Campos obrigatórios: pedido_compra_id e uma lista de itens_recebidos.' });
        return;
    }

    const client = await pool.connect();
    console.log(`${logPrefix} Usuário ${usuario_id} iniciando entrada em estoque.`);

    try {
        await client.query('BEGIN');
        console.log(`${logPrefix} Transação iniciada.`);

        let hasDivergence = false;
        let allItemsDivergent = true;

        const checkExistente = await client.query(
            "SELECT id FROM movimentacao_estoque WHERE pedido_compra_id = $1 AND status IN ('CONCLUIDA', 'CONCLUIDA_PARCIALMENTE', 'PENDENTE_AUDITORIA')",
            [pedido_compra_id]
        );
        if (checkExistente.rows.length > 0) {
            throw new Error('A entrada para este pedido de compra já foi processada ou está em auditoria.');
        }

        const movQuery = `
            INSERT INTO movimentacao_estoque (tipo, usuario_id, pedido_compra_id, observacao, status, nf_numero, nf_chave_acesso, nf_data_emissao)
            VALUES ('ENTRADA', $1, $2, $3, 'CONCLUIDA', $4, $5, $6) RETURNING id;
        `;
        const movResult = await client.query(movQuery, [usuario_id, pedido_compra_id, observacao, nf_numero, nf_chave_acesso, nf_data_emissao ? new Date(nf_data_emissao) : null]);
        const movimentacaoId = movResult.rows[0].id;
        console.log(`${logPrefix} Cabeçalho da movimentação criado com ID: ${movimentacaoId}.`);

        for (const item of itens_recebidos) {
            const qtdDiverge = Number(item.quantidade_recebida) !== Number(item.quantidade_pedida);
            const vlrDiverge = Number(item.valor_unitario_recebido) !== Number(item.valor_unitario_pedido);
            const isDivergent = qtdDiverge || vlrDiverge;
            
            let itemStatus = 'CONCLUIDO';
            if (isDivergent) {
                hasDivergence = true;
                itemStatus = 'PENDENTE_AUDITORIA';
            } else {
                allItemsDivergent = false;
            }

            const itemMovQuery = `
                INSERT INTO movimentacao_estoque_item (movimentacao_id, item_estoque_id, quantidade_movimentada, valor_unitario_na_movimentacao, status)
                VALUES ($1, $2, $3, $4, $5) RETURNING id;
            `;
            const itemMovResult = await client.query(itemMovQuery, [movimentacaoId, item.item_estoque_id, item.quantidade_recebida, item.valor_unitario_recebido, itemStatus]);
            const movimentacaoItemId = itemMovResult.rows[0].id;

            if (isDivergent) {
                if (qtdDiverge) {
                    await client.query(`INSERT INTO auditoria_divergencia (movimentacao_item_id, tipo_divergencia, valor_esperado, valor_recebido) VALUES ($1, 'QUANTIDADE', $2, $3)`, [movimentacaoItemId, item.quantidade_pedida, item.quantidade_recebida]);
                }
                if (vlrDiverge) {
                    await client.query(`INSERT INTO auditoria_divergencia (movimentacao_item_id, tipo_divergencia, valor_esperado, valor_recebido) VALUES ($1, 'VALOR', $2, $3)`, [movimentacaoItemId, item.valor_unitario_pedido, item.valor_unitario_recebido]);
                }
                console.log(`${logPrefix} Divergência registrada para o item ${item.item_estoque_id}.`);
            } else {
                await client.query(`UPDATE item_estoque SET estoque_atual = estoque_atual + $1 WHERE id = $2;`, [item.quantidade_recebida, item.item_estoque_id]);

                // Se filial_id foi enviado, atualizar também estoque_filial
                if (req.body.filial_id) {
                    await client.query(`INSERT INTO estoque_filial (filial_id, item_id, quantidade)
                                         VALUES ($1, $2, $3)
                                         ON CONFLICT (filial_id, item_id)
                                         DO UPDATE SET quantidade = estoque_filial.quantidade + EXCLUDED.quantidade`,
                                         [req.body.filial_id, item.item_estoque_id, item.quantidade_recebida]);
                }

                console.log(`${logPrefix} Item ${item.item_estoque_id} atualizado no estoque.`);
            }
        }
        
        let finalMovStatus = 'CONCLUIDA';
        let finalPedidoStatus = 'FINALIZADO';
        let responseMessage = 'Entrada de estoque registrada e todos os itens atualizados.';

        if (hasDivergence) {
            finalPedidoStatus = 'RECEBIDO_COM_DIVERGENCIA';
            finalMovStatus = allItemsDivergent ? 'PENDENTE_AUDITORIA' : 'CONCLUIDA_PARCIALMENTE';
            responseMessage = `Entrada registrada. Itens sem divergência foram adicionados ao estoque. Itens divergentes aguardam auditoria.`;
        }

        await client.query('UPDATE movimentacao_estoque SET status = $1 WHERE id = $2', [finalMovStatus, movimentacaoId]);
        await client.query("UPDATE orcamento SET status = $1 WHERE id = $2 AND tipo = 'PEDIDO'", [finalPedidoStatus, pedido_compra_id]);
        
        console.log(`${logPrefix} Status final da movimentação: ${finalMovStatus}. Status final do pedido: ${finalPedidoStatus}.`);

        await client.query('COMMIT');
        console.log(`${logPrefix} Transação concluída com sucesso.`);
        
        await registrarAuditoria(usuario_id, 'ENTRADA_ESTOQUE', 'movimentacao_estoque', movimentacaoId, `Entrada do pedido ${pedido_compra_id} registrada. Status: ${finalMovStatus}`);
        res.status(201).json({ 
            message: responseMessage, 
            movimentacaoId,
            hasDivergence 
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`${logPrefix} ERRO FATAL! Transação revertida.`, error);
        res.status(500).json({ error: 'Falha ao registrar a entrada de estoque.', details: error.message });
    } finally {
        client.release();
        console.log(`${logPrefix} Conexão com o banco de dados liberada.`);
    }
};

export const listarMovimentacoes = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT
                m.id,
                m.status,
                m.tipo as tipo_movimentacao,
                m.data_movimentacao,
                m.observacao,
                u.nome as nome_usuario,
                (SELECT COUNT(mi.id) FROM movimentacao_estoque_item mi WHERE mi.movimentacao_id = m.id) as total_itens
            FROM 
                movimentacao_estoque m
            LEFT JOIN 
                usuario u ON m.usuario_id = u.id
            ORDER BY 
                m.data_movimentacao DESC;
        `;

        const result = await pool.query(query);

        res.status(200).json({ movimentacoes: result.rows });

    } catch (err: any) {
        console.error("Erro ao buscar movimentações:", err);
        res.status(500).json({ error: 'Falha ao buscar o histórico de movimentações.', details: err.message });
    }
};

export const getMovimentacaoById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
        // Query para os detalhes da movimentação principal
        const movQuery = `
            SELECT 
                m.*,
                u.nome as nome_usuario,
                o.id as pedido_id,
                f.nome as nome_fornecedor
            FROM movimentacao_estoque m
            LEFT JOIN usuario u ON m.usuario_id = u.id
            LEFT JOIN orcamento o ON m.pedido_compra_id = o.id
            LEFT JOIN fornecedor f ON o.id_fornecedor = f.id
            WHERE m.id = $1;
        `;
        const movResult = await client.query(movQuery, [id]);

        if (movResult.rows.length === 0) {
            res.status(404).json({ error: "Movimentação não encontrada." });
            return;
        }

        // Query para os itens da movimentação e suas possíveis divergências
        const itensQuery = `
            WITH divergencias_agrupadas AS (
                SELECT 
                    movimentacao_item_id,
                    STRING_AGG(tipo_divergencia, ', ') as tipo_divergencia,
                    MIN(status) as status_auditoria,
                    MIN(justificativa_auditoria) as justificativa_auditoria
                FROM auditoria_divergencia
                GROUP BY movimentacao_item_id
            )
            SELECT 
                mi.id as movimentacao_item_id,
                mi.status as item_status,
                i.id as item_estoque_id,
                i.descricao as item_nome,
                i.tipo_unid as unidade_medida,
                oi.quantidade as quantidade_pedida,
                oi.valor_unitario as valor_unitario_pedido,
                mi.quantidade_movimentada as quantidade_recebida,
                mi.valor_unitario_na_movimentacao as valor_unitario_recebido,
                da.tipo_divergencia,
                da.status_auditoria,
                da.justificativa_auditoria
            FROM movimentacao_estoque_item mi
            JOIN item_estoque i ON mi.item_estoque_id = i.id
            JOIN movimentacao_estoque m ON mi.movimentacao_id = m.id
            JOIN orcamento_item oi ON m.pedido_compra_id = oi.orcamento_id AND mi.item_estoque_id = oi.item_estoque_id
            LEFT JOIN divergencias_agrupadas da ON mi.id = da.movimentacao_item_id
            WHERE mi.movimentacao_id = $1;
        `;
        const itensResult = await client.query(itensQuery, [id]);

        const movimentacaoDetalhes = {
            ...movResult.rows[0],
            itens: itensResult.rows
        };

        res.status(200).json(movimentacaoDetalhes);

    } catch (error: any) {
        console.error(`Erro ao buscar detalhes da movimentação ${id}:`, error);
        res.status(500).json({ error: "Falha ao buscar detalhes da movimentação.", details: error.message });
    } finally {
        client.release();
    }
};

export const getEstoqueDisponivelFilial = async (req: Request, res: Response): Promise<void> => {
    const { filialId } = req.params;
    try {
        const result = await pool.query(
            `SELECT ef.item_id, ef.quantidade, i.descricao, i.codigo
             FROM estoque_filial ef
             JOIN item_estoque i ON i.id = ef.item_id
             WHERE ef.filial_id = $1 AND ef.quantidade > 0
             ORDER BY i.descricao`,
            [filialId]
        );
        res.status(200).json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// -----------------------
//  ENTRADA MANUAL
// -----------------------
export const registrarEntradaManual = async (req: Request, res: Response): Promise<void> => {
    const { filial_id, itens, observacao } = req.body;
    const usuario_id = (req as any).user?.id;

    if(!filial_id || !Array.isArray(itens) || itens.length===0){
        res.status(400).json({ error: 'Campos obrigatórios: filial_id e lista de itens.' });
        return;
    }

    const client = await pool.connect();
    const logPrefix = `[ENTRADA_MANUAL_${filial_id}]`;

    try{
        await client.query('BEGIN');

        const movRes = await client.query(`INSERT INTO movimentacao_estoque (tipo, filial_id, usuario_id, observacao, status)
                                           VALUES ('ENTRADA_MANUAL', $1, $2, $3, 'CONCLUIDA') RETURNING id`,
                                           [filial_id, usuario_id, observacao]);
        const movimentacaoId = movRes.rows[0].id;

        for(const it of itens){
            const { item_id, quantidade, valor_unitario } = it;
            await client.query(`INSERT INTO movimentacao_estoque_item (movimentacao_id, item_estoque_id, quantidade_movimentada, valor_unitario_na_movimentacao, status)
                                VALUES ($1,$2,$3,$4,'CONCLUIDO')`,
                                [movimentacaoId,item_id,quantidade,valor_unitario||null]);

            // Atualiza estoque_filial (upsert)
            await client.query(`INSERT INTO estoque_filial (filial_id, item_id, quantidade)
                                VALUES ($1,$2,$3)
                                ON CONFLICT (filial_id, item_id) DO UPDATE SET quantidade = estoque_filial.quantidade + EXCLUDED.quantidade`,
                                [filial_id,item_id,quantidade]);
        }

        await client.query('COMMIT');
        await registrarAuditoria(usuario_id,'ENTRADA_MANUAL','movimentacao_estoque',movimentacaoId,`Entrada manual na filial ${filial_id}`);
        res.status(201).json({ message:'Entrada manual registrada', movimentacaoId });
    }catch(err:any){
        await client.query('ROLLBACK');
        console.error(logPrefix, err);
        res.status(500).json({ error: err.message });
    }finally{
        client.release();
    }
};

// -----------------------
//  SAÍDA MANUAL
// -----------------------
export const registrarSaidaManual = async (req: Request, res: Response): Promise<void> => {
    const { filial_id, itens, observacao } = req.body;
    const usuario_id = (req as any).user?.id;
    if(!filial_id || !Array.isArray(itens) || itens.length===0){
        res.status(400).json({ error:'Campos obrigatórios: filial_id e lista de itens.'});
        return;
    }

    const client = await pool.connect();
    const logPrefix = `[SAIDA_MANUAL_${filial_id}]`;
    try{
        await client.query('BEGIN');
        const mov = await client.query(`INSERT INTO movimentacao_estoque (tipo, filial_id, usuario_id, observacao, status)
                                        VALUES ('SAIDA_MANUAL',$1,$2,$3,'CONCLUIDA') RETURNING id`,
                                        [filial_id,usuario_id,observacao]);
        const movimentacaoId = mov.rows[0].id;

        for(const it of itens){
            const { item_id, quantidade } = it;
            // Verifica saldo
            const saldoRes = await client.query(`SELECT quantidade FROM estoque_filial WHERE filial_id=$1 AND item_id=$2`,[filial_id,item_id]);
            const saldoAtual = saldoRes.rows[0]?.quantidade || 0;
            if(Number(saldoAtual) < Number(quantidade)){
                throw new Error(`Saldo insuficiente para o item ${item_id}. Disponível: ${saldoAtual}`);
            }
            await client.query(`INSERT INTO movimentacao_estoque_item (movimentacao_id, item_estoque_id, quantidade_movimentada, status)
                                VALUES ($1,$2,$3,'CONCLUIDO')`,
                                [movimentacaoId,item_id,-Math.abs(quantidade)]);
            await client.query(`UPDATE estoque_filial SET quantidade = quantidade - $1 WHERE filial_id=$2 AND item_id=$3`,
                                [quantidade,filial_id,item_id]);
        }

        await client.query('COMMIT');
        await registrarAuditoria(usuario_id,'SAIDA_MANUAL','movimentacao_estoque',movimentacaoId,`Saída manual filial ${filial_id}`);
        res.status(201).json({ message:'Saída manual registrada', movimentacaoId });
    }catch(err:any){
        await client.query('ROLLBACK');
        console.error(logPrefix,err);
        res.status(500).json({ error: err.message });
    }finally{
        client.release();
    }
};

// -----------------------
//  REMANEJAMENTO ENTRE FILIAIS
// -----------------------
export const registrarRemanejamentoEstoque = async (req: Request, res: Response): Promise<void> => {
    const { filial_origem_id, filial_destino_id, itens, observacao } = req.body;
    const usuario_id = (req as any).user?.id;

    if(!filial_origem_id || !filial_destino_id || filial_origem_id===filial_destino_id || !Array.isArray(itens) || itens.length===0){
        res.status(400).json({ error:'Campos obrigatórios: filiais distintas e lista de itens.'});
        return;
    }

    const client = await pool.connect();
    const logPrefix = `[REMANEJO_${filial_origem_id}->${filial_destino_id}]`;
    try{
        await client.query('BEGIN');
        const mov = await client.query(`INSERT INTO movimentacao_estoque (tipo, filial_id, usuario_id, observacao, status)
                                         VALUES ('REMANEJO',$1,$2,$3,'CONCLUIDA') RETURNING id`,
                                         [filial_origem_id,usuario_id,observacao]);
        const movimentacaoId = mov.rows[0].id;

        for(const it of itens){
            const { item_id, quantidade } = it;
            // verifica saldo origem
            const saldoRes = await client.query(`SELECT quantidade FROM estoque_filial WHERE filial_id=$1 AND item_id=$2`,[filial_origem_id,item_id]);
            const saldoAtual = saldoRes.rows[0]?.quantidade || 0;
            if(Number(saldoAtual) < Number(quantidade)){
                throw new Error(`Saldo insuficiente na filial origem para o item ${item_id}. Disponível: ${saldoAtual}`);
            }

            // saída na origem (quantidade negativa na origem)
            await client.query(`INSERT INTO movimentacao_estoque_item (movimentacao_id, item_estoque_id, quantidade_movimentada, status)
                                VALUES ($1,$2,$3,'CONCLUIDO')`,[movimentacaoId,item_id,-Math.abs(quantidade)]);
            await client.query(`UPDATE estoque_filial SET quantidade = quantidade - $1 WHERE filial_id=$2 AND item_id=$3`,[quantidade,filial_origem_id,item_id]);

            // entrada na destino
            await client.query(`INSERT INTO estoque_filial (filial_id,item_id,quantidade)
                                VALUES ($1,$2,$3)
                                ON CONFLICT (filial_id,item_id) DO UPDATE SET quantidade = estoque_filial.quantidade + EXCLUDED.quantidade`,
                                [filial_destino_id,item_id,quantidade]);
        }

        await client.query('COMMIT');
        await registrarAuditoria(usuario_id,'REMANEJO_ESTOQUE','movimentacao_estoque',movimentacaoId,`Remanejo de ${filial_origem_id} para ${filial_destino_id}`);
        res.status(201).json({ message:'Remanejamento registrado', movimentacaoId });
    }catch(err:any){
        await client.query('ROLLBACK');
        console.error(logPrefix,err);
        res.status(500).json({ error: err.message });
    }finally{
        client.release();
    }
};