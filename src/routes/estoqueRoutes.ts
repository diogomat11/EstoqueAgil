import { Router } from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { getEstoqueResumo, getEstoqueAlertas, getEstoqueKPIs, getCoberturaEstoque, getEstoqueVisao } from '../controllers/estoqueController';

console.log('[ROUTES] Carregando rotas de Estoque Geral...');

const router = Router();

// Todas as rotas exigem usuário autenticado
router.use(authenticateJWT);

// Permitir acesso a qualquer perfil autenticado (ADMIN, USER etc.)
router.get('/resumo', getEstoqueResumo);
router.get('/alertas', getEstoqueAlertas);
router.get('/kpis', getEstoqueKPIs);
router.get('/cobertura', getCoberturaEstoque);
router.get('/visao', getEstoqueVisao);

export default router; 