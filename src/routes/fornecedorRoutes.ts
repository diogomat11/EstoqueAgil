import { Router } from 'express';
import { createFornecedor, getFornecedores, getFornecedorById, updateFornecedor, deleteFornecedor } from '../controllers/fornecedorController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.post('/fornecedor', authenticateJWT, createFornecedor);
router.get('/fornecedor', authenticateJWT, getFornecedores);
router.get('/fornecedor/:id', authenticateJWT, getFornecedorById);
router.put('/fornecedor/:id', authenticateJWT, updateFornecedor);
router.delete('/fornecedor/:id', authenticateJWT, deleteFornecedor);

export default router; 