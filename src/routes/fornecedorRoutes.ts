import { Router } from 'express';
import { createFornecedor, getFornecedores } from '../controllers/fornecedorController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.post('/fornecedor', authenticateJWT, createFornecedor);
router.get('/fornecedor', authenticateJWT, getFornecedores);

export default router; 