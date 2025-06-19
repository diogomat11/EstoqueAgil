import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabaseAdmin';
import { pool } from '../database';

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('Verificando autenticação...');
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.error('Header de autorização não encontrado');
    res.status(401).json({ error: 'Token não fornecido.' });
    return;
  }

  console.log('Header de autorização encontrado');
  const token = authHeader.split(' ')[1];
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error) {
      console.error('Erro na verificação do token:', error);
      res.status(403).json({ error: 'Token inválido ou expirado.', details: error });
      return;
    }
    
    console.log('Token verificado com sucesso');
    (req as any).user = user;
    next();
  } catch (err) {
    console.error('Erro inesperado na verificação do token:', err);
    res.status(403).json({ error: 'Erro na verificação do token', details: err });
    return;
  }
};

export const isAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('Verificando se usuário é admin...');
  const user = (req as any).user;

  if (!user || !user.email) {
    console.error('Usuário não encontrado no request');
    res.status(403).json({ error: 'Usuário não autenticado' });
    return;
  }

  try {
    // Verificar no banco de dados se o usuário tem perfil admin
    const result = await pool.query(
      'SELECT perfil FROM usuario WHERE email = $1',
      [user.email]
    );

    if (result.rows.length === 0) {
      console.error('Usuário não encontrado no banco:', user.email);
      res.status(403).json({ error: 'Usuário não encontrado' });
      return;
    }

    if (result.rows[0].perfil !== 'admin') {
      console.error('Usuário não é admin:', user.email);
      res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
      return;
    }

    console.log('Usuário confirmado como admin:', user.email);
    next();
  } catch (err) {
    console.error('Erro ao verificar perfil do usuário:', err);
    res.status(500).json({ error: 'Erro ao verificar permissões do usuário' });
    return;
  }
}; 