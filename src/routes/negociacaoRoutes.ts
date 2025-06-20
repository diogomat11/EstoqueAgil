import { Router } from 'express';
import {
    getNegociacoes,
    createNegociacao
    // getNegociacaoById, updateNegociacao, deleteNegociacao (futuro)
} from '../controllers/orcamentoController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateJWT, getNegociacoes);
router.post('/', authenticateJWT, createNegociacao);
// router.get('/:id', authenticateJWT, getNegociacaoById);
// router.put('/:id', authenticateJWT, updateNegociacao);
// router.delete('/:id', authenticateJWT, deleteNegociacao);

export default router; 