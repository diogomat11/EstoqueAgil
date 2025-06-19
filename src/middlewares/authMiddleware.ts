import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabaseAdmin';

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