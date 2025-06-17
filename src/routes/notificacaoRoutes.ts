import { Router } from 'express';
import { listarNotificacoes, marcarNotificacaoLida } from '../controllers/notificacaoController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.get('/notificacoes', authenticateJWT, listarNotificacoes);
router.patch('/notificacoes/:id/lida', authenticateJWT, marcarNotificacaoLida);

export default router; 