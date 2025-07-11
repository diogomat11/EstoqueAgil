import { PoolClient } from 'pg';
import { pool } from '../database';

export type EtapaFluxo = 'REQUISICAO' | 'COTACAO' | 'APROVACAO' | 'PEDIDO' | 'RECEBIMENTO' | 'CONCLUIDO';

interface HistoricoOptions {
  usuarioId?: number | null;
  observacao?: string | null;
}

export interface MoveOptions extends HistoricoOptions { restart?: boolean }

// Cria nova demanda ligada a uma requisição
export async function criarDemandaFluxo(
  client: PoolClient | null,
  requisicaoId: number,
  etapa: EtapaFluxo,
  responsavelId: number | null,
  opts: HistoricoOptions = {}
): Promise<number> {
  const c = client ?? (await pool.connect());
  try {
    const nomePadrao = `Fluxo Requisição #${requisicaoId}`;
    const descPadrao = opts.observacao ?? `Etapa ${etapa}`;
    const demandaRes = await c.query(
      `INSERT INTO demanda (nome, descricao, tipo, requisicao_id, etapa, status)
       VALUES ($1,$2,'FLUXO_COMPRAS',$3,$4,'EM_ANDAMENTO') RETURNING id`,
      [nomePadrao, descPadrao, requisicaoId, etapa]
    );
    const demandaId = demandaRes.rows[0].id;

    if (responsavelId) {
      await c.query(
        `INSERT INTO demanda_responsavel (demanda_id, usuario_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [demandaId, responsavelId]
      );
    }

    // histórico
    await c.query(
      `INSERT INTO demanda_historico (demanda_id, acao, usuario_id, observacao)
       VALUES ($1,'CRIACAO',$2,$3)`,
      [demandaId, opts.usuarioId ?? responsavelId, opts.observacao]
    );

    return demandaId;
  } finally {
    if (!client) c.release();
  }
}

// Fecha demanda atual e cria nova etapa
export async function moverDemandaEtapa(
  requisicaoId: number,
  novaEtapa: EtapaFluxo,
  novoResponsavelId: number | null,
  opts: MoveOptions = {}
): Promise<void> {
  const etapaAtual = await obterEtapaAtual(requisicaoId);

  // Se já está na etapa desejada apenas garante responsável
  if (etapaAtual === novaEtapa) {
    if (novoResponsavelId) {
      await pool.query(
        `INSERT INTO demanda_responsavel (demanda_id, usuario_id)
         SELECT id,$1 FROM demanda WHERE requisicao_id=$2 AND status='EM_ANDAMENTO'
         ON CONFLICT DO NOTHING`,
        [novoResponsavelId, requisicaoId]
      );
    }
    return;
  }

  // Caso padrão: atualizar a mesma demanda para nova etapa
  if (!opts.restart) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const latestRes = await client.query(`SELECT id FROM demanda WHERE requisicao_id=$1 AND status<>'ENCERRADO' ORDER BY id DESC LIMIT 1`,[requisicaoId]);
      if(latestRes.rowCount===0){
        // não existe, cria
        await criarDemandaFluxo(client,requisicaoId,novaEtapa,novoResponsavelId,opts);
      } else {
        const demandaId=latestRes.rows[0].id;
        await client.query(`UPDATE demanda SET etapa=$1, descricao=$2, updated_at=NOW() WHERE id=$3`,[novaEtapa,`Etapa ${novaEtapa}`,demandaId]);
        await client.query(`UPDATE demanda SET status='ENCERRADO', updated_at=NOW() WHERE requisicao_id=$1 AND status<>'ENCERRADO' AND id<>$2`,[requisicaoId,demandaId]);
        await client.query(`INSERT INTO demanda_historico (demanda_id, acao, usuario_id, observacao) VALUES ($1,$2,$3,$4)`,[demandaId,`MUDANCA_${etapaAtual}_PARA_${novaEtapa}`,opts.usuarioId,opts.observacao]);
        if(novoResponsavelId){
          await client.query(`INSERT INTO demanda_responsavel (demanda_id, usuario_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,[demandaId,novoResponsavelId]);
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return;
  }

  // Se restart=true, fecha a atual e cria nova (reprovação, etc.)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const atualRes = await client.query(
      `UPDATE demanda SET status='ENCERRADO', updated_at=NOW() WHERE requisicao_id=$1 AND status='EM_ANDAMENTO' RETURNING id`,
      [requisicaoId]
    );
    const demandaAnteriorId = atualRes.rows[0]?.id;
    if (demandaAnteriorId) {
      await client.query(
        `INSERT INTO demanda_historico (demanda_id, acao, usuario_id, observacao)
         VALUES ($1,'ENCERRAMENTO',$2,$3)`,
        [demandaAnteriorId, opts.usuarioId, opts.observacao]
      );
    }
    await criarDemandaFluxo(client, requisicaoId, novaEtapa, novoResponsavelId, opts);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getResponsavelPorPerfil(perfil: string): Promise<number | null> {
  const res = await pool.query(`SELECT id FROM usuario WHERE UPPER(perfil) = UPPER($1) LIMIT 1`, [perfil]);
  return res.rows[0]?.id ?? null;
}

export async function obterEtapaAtual(requisicaoId:number):Promise<EtapaFluxo|null>{
  const res=await pool.query(`SELECT etapa FROM demanda WHERE requisicao_id=$1 AND status='EM_ANDAMENTO' LIMIT 1`,[requisicaoId]);
  return res.rows[0]?.etapa ?? null;
} 