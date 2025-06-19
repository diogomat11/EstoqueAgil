import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  console.log('Verificando autenticação...');
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    console.log('Header de autorização encontrado');
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
      if (err) {
        console.error('Erro na verificação do token:', err);
        return res.status(403).json({ error: 'Token inválido ou expirado.', details: err });
      }
      console.log('Token verificado com sucesso');
      (req as any).user = user;
      next();
    });
  } else {
    console.error('Header de autorização não encontrado');
    res.status(401).json({ error: 'Token não fornecido.' });
  }
}; 