import { Request, Response } from 'express';
import { pool } from '../database';
import { PoolClient } from 'pg';

// Criar notificação (uso interno, pode ser parte de uma transação)
export const criarNotificacao = async (
  dbClient: PoolClient, // Usa o client da transação
  usuario_id: number,
  titulo: string,
  mensagem: string,
  link?: string
) => {
  // O ideal seria ter colunas 'titulo' e 'link' na tabela.
  // Como fallback, vamos combinar tudo na mensagem.
  const fullMessage = `${titulo}: ${mensagem}${link ? ` (Acesse: ${link})` : ''}`;

  await dbClient.query(
    'INSERT INTO notificacao (usuario_id, mensagem) VALUES ($1, $2)',
    [usuario_id, fullMessage]
  );
};

// Listar notificações do usuário
export const listarNotificacoes = async (req: Request, res: Response) => {
  const usuario_id = (req as any).user?.id;
  try {
    const result = await pool.query(
      'SELECT * FROM notificacao WHERE usuario_id = $1 ORDER BY data DESC',
      [usuario_id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Marcar notificação como lida
export const marcarNotificacaoLida = async (req: Request, res: Response) => {
  const usuario_id = (req as any).user?.id;
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE notificacao SET lida = TRUE WHERE id = $1 AND usuario_id = $2',
      [id, usuario_id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 