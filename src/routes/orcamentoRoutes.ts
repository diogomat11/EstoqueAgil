import { Router } from 'express';
import { criarOrcamento, listarOrcamentosPorRequisicao, atualizarStatusOrcamento } from '../controllers/orcamentoController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

router.post('/orcamento', authenticateJWT, criarOrcamento);
router.get('/orcamento/requisicao/:requisicao_id', authenticateJWT, listarOrcamentosPorRequisicao);
router.patch('/orcamento/:id/status', authenticateJWT, authorize(['APROVADOR', 'ADMIN']), atualizarStatusOrcamento);

export default router; 