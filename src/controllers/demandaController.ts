import { Request, Response } from 'express';
import { pool } from '../database';

// [CONTROLLER] DSO - Demandas (Diretório de Serviços Operacionais)

export const criarDemanda = async (req: Request, res: Response): Promise<void> => {
  const { nome, descricao, prazo_conclusao, tipo, responsaveis } = req.body;
  const cadastradoPorId = (req as any).user?.id;

  if (!nome) {
    res.status(400).json({ error: 'Nome da demanda é obrigatório' });
    return;
  }

  try {
    // 1. Inserir demanda
    const demandaResult = await pool.query(
      `INSERT INTO demanda (nome, descricao, prazo_conclusao, tipo, cadastrado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nome, descricao, prazo_conclusao, tipo, cadastradoPorId]
    );

    const demanda = demandaResult.rows[0];

    // 2. Inserir responsáveis, se informados
    if (Array.isArray(responsaveis) && responsaveis.length > 0) {
      const valuesSql = responsaveis
        .map((userId: number, idx: number) => `($1, $${idx + 2})`)
        .join(',');
      await pool.query(
        `INSERT INTO demanda_responsavel (demanda_id, usuario_id) VALUES ${valuesSql}`,
        [demanda.id, ...responsaveis]
      );
    }

    res.status(201).json(demanda);
  } catch (err: any) {
    console.error('[DEMANDA] Erro ao criar demanda:', err);
    res.status(500).json({ error: err.message });
  }
};

export const getDemandas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, 
              d.requisicao_id,
              json_agg(json_build_object('id', u.id, 'nome', u.nome)) AS responsaveis
       FROM demanda d
       LEFT JOIN demanda_responsavel dr ON dr.demanda_id = d.id
       LEFT JOIN usuario u ON u.id = dr.usuario_id
       GROUP BY d.id
       ORDER BY d.data_cadastro DESC`
    );
    res.json(rows);
  } catch (err: any) {
    console.error('[DEMANDA] Erro ao listar demandas:', err);
    res.status(500).json({ error: err.message });
  }
};

export const getDemandaById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT d.*, 
              json_agg(json_build_object('id', u.id, 'nome', u.nome)) AS responsaveis
       FROM demanda d
       LEFT JOIN demanda_responsavel dr ON dr.demanda_id = d.id
       LEFT JOIN usuario u ON u.id = dr.usuario_id
       WHERE d.id = $1
       GROUP BY d.id`,
      [id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Demanda não encontrada' });
    } else {
      res.json(rows[0]);
    }
  } catch (err: any) {
    console.error('[DEMANDA] Erro ao obter demanda:', err);
    res.status(500).json({ error: err.message });
  }
};

export const updateDemanda = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { nome, descricao, prazo_conclusao, tipo, responsaveis } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE demanda SET
         nome = COALESCE($1, nome),
         descricao = COALESCE($2, descricao),
         prazo_conclusao = COALESCE($3, prazo_conclusao),
         tipo = COALESCE($4, tipo),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [nome, descricao, prazo_conclusao, tipo, id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Demanda não encontrada' });
      return;
    }

    // atualizar responsáveis
    if (Array.isArray(responsaveis)) {
      // limpar antigos
      await pool.query('DELETE FROM demanda_responsavel WHERE demanda_id = $1', [id]);
      if (responsaveis.length > 0) {
        const valuesSql = responsaveis
          .map((userId: number, idx: number) => `($1, $${idx + 2})`)
          .join(',');
        await pool.query(
          `INSERT INTO demanda_responsavel (demanda_id, usuario_id) VALUES ${valuesSql}`,
          [id, ...responsaveis]
        );
      }
    }

    res.json(rows[0]);
  } catch (err: any) {
    console.error('[DEMANDA] Erro ao atualizar demanda:', err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteDemanda = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('DELETE FROM demanda WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Demanda não encontrada' });
    } else {
      res.status(204).send();
    }
  } catch (err: any) {
    console.error('[DEMANDA] Erro ao excluir demanda:', err);
    res.status(500).json({ error: err.message });
  }
}; 