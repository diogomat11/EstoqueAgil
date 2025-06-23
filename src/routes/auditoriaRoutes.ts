import { Router } from 'express';
import { resolverDivergenciaItem } from '../controllers/auditoriaController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

// Aplica autenticação e autorização para todas as rotas de auditoria
router.use(authenticateJWT);
router.use(authorize(['ADMIN', 'SUPERVISOR']));

// Rota para resolver a divergência de um item específico
router.post('/divergencia/:movimentacao_item_id/resolver', resolverDivergenciaItem);

export default router; 