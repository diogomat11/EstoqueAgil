import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabaseAdmin';
import { pool } from '../database';

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({ error: 'Token não fornecido.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // 1. Verificar o token com o Supabase para obter o usuário autenticado
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !authUser) {
      console.error('Falha na autenticação do token Supabase:', authError?.message);
      res.status(403).json({ error: 'Token inválido ou expirado.' });
      return;
    }
    
    // 2. Com o email do usuário autenticado, buscar o perfil completo em nosso banco de dados local
    const { rows: localUsers } = await pool.query(
      'SELECT * FROM usuario WHERE LOWER(email) = LOWER($1)',
      [authUser.email]
    );

    if (localUsers.length === 0) {
      console.error(`Usuário autenticado via Supabase (email: ${authUser.email}) não encontrado em nosso banco de dados local.`);
      res.status(403).json({ error: 'Usuário autenticado, mas não registrado no sistema.' });
      return;
    }

    // 3. Anexar o usuário do *nosso banco de dados* (que contém o perfil) à requisição
    (req as any).user = localUsers[0];
    
    next();
  } catch (err) {
    console.error('Erro inesperado no middleware de autenticação:', err);
    res.status(500).json({ error: 'Erro interno no servidor durante a autenticação.' });
  }
}; 