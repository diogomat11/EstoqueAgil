import { Router } from 'express';
import {
  saldoEstoque,
  itensMaisMovimentados,
  requisicoesPorStatus,
  requisicoesPorUsuario,
  orcamentosPorStatus,
  orcamentosPorFornecedor,
  orcamentosPorPeriodo
} from '../controllers/dashboardController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.get('/dashboard/estoque', authenticateJWT, saldoEstoque);
router.get('/dashboard/itens-mais-movimentados', authenticateJWT, itensMaisMovimentados);
router.get('/dashboard/requisicoes-status', authenticateJWT, requisicoesPorStatus);
router.get('/dashboard/requisicoes-usuario', authenticateJWT, requisicoesPorUsuario);
router.get('/dashboard/orcamentos-status', authenticateJWT, orcamentosPorStatus);
router.get('/dashboard/orcamentos-fornecedor', authenticateJWT, orcamentosPorFornecedor);
router.get('/dashboard/orcamentos-periodo', authenticateJWT, orcamentosPorPeriodo);

export default router; 