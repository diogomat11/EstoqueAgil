import { Router } from 'express';
import {
    gerarOrcamentoFromRequisicao,
    getOrcamentoParaCotacao,
    salvarCotacoes,
    atualizarStatusOrcamento,
    processarAprovacao
} from '../controllers/orcamentoController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

// Rota para iniciar um orçamento a partir de uma requisição
router.post('/gerar', authenticateJWT, gerarOrcamentoFromRequisicao);

// Rotas para lidar com a tela de cotação de um orçamento específico
router.get('/:id/cotacao', authenticateJWT, getOrcamentoParaCotacao);
router.post('/:id/cotacao', authenticateJWT, salvarCotacoes);
router.patch('/:id/status', authenticateJWT, atualizarStatusOrcamento);
router.post('/:id/processar_aprovacao', authenticateJWT, processarAprovacao);

export default router; 