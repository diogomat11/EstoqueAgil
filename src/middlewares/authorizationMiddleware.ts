import { Request, Response, NextFunction } from 'express';

export function authorize(perfisPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const perfil = (req as any).user?.perfil;
    if (!perfil || !perfisPermitidos.includes(perfil)) {
      res.status(403).json({ error: 'Acesso negado.' });
      return;
    }
    next();
  };
} 