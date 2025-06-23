import { Router } from 'express';
import {
    getOrcamentos,
    gerarOrcamentoFromRequisicao,
    getOrcamentoParaCotacao,
    salvarCotacoes,
    atualizarStatusOrcamento,
    processarAprovacao,
    deleteOrcamento
} from '../controllers/orcamentoController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

// Rota para listar todos os orçamentos
router.get('/', authenticateJWT, getOrcamentos);

// Rota para deletar um orçamento
router.delete('/:id', authenticateJWT, deleteOrcamento);

// Rota para iniciar um orçamento a partir de uma requisição
router.post('/gerar', authenticateJWT, gerarOrcamentoFromRequisicao);

// Rotas para lidar com a tela de cotação de um orçamento específico
router.get('/:id/cotacao', authenticateJWT, getOrcamentoParaCotacao);
router.post('/:id/cotacao', authenticateJWT, salvarCotacoes);
router.patch('/:id/status', authenticateJWT, atualizarStatusOrcamento);
router.post(
    '/:id/processar_aprovacao', 
    authenticateJWT, 
    authorize(['SUPERVISOR', 'ADMINISTRADOR', 'ADMIN']), 
    processarAprovacao
);

export default router; 