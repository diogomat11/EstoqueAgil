import { Router } from 'express';
import { criarRequisicao, listarRequisicoes, atualizarStatusRequisicao, listarHistoricoRequisicao } from '../controllers/requisicaoController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

router.post('/requisicao', authenticateJWT, criarRequisicao);
router.get('/requisicao', authenticateJWT, listarRequisicoes);
router.patch('/requisicao/:id/status', authenticateJWT, authorize(['APROVADOR', 'ADMIN']), atualizarStatusRequisicao);
router.get('/requisicao/:id/historico', authenticateJWT, listarHistoricoRequisicao);

export default router;
