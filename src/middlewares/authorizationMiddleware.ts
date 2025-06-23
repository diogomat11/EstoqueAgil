import { Request, Response, NextFunction } from 'express';

export function authorize(perfisPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const perfilUsuario = (req as any).user?.perfil?.toUpperCase();
    const perfisPermitidosUpperCase = perfisPermitidos.map(p => p.toUpperCase());

    if (!perfilUsuario || !perfisPermitidosUpperCase.includes(perfilUsuario)) {
      res.status(403).json({ error: 'Acesso negado. Você não tem permissão para realizar esta ação.' });
      return;
    }
    
    next();
  };
} 