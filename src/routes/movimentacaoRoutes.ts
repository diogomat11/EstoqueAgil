import { Router } from 'express';
import { registrarMovimentacao, listarMovimentacoes } from '../controllers/movimentacaoController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.post('/movimentacao', authenticateJWT, registrarMovimentacao);
router.get('/movimentacao', authenticateJWT, listarMovimentacoes);

export default router; 