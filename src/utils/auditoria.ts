import { pool } from '../database';

export async function registrarAuditoria(usuario_id: number, acao: string, tabela: string, registro_id: number, detalhes: string) {
  await pool.query(
    `INSERT INTO auditoria (usuario_id, acao, tabela, registro_id, detalhes)
     VALUES ($1, $2, $3, $4, $5)`,
    [usuario_id, acao, tabela, registro_id, detalhes]
  );
} 