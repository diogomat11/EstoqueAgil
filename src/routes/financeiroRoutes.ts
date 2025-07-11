import { Router } from 'express';
import { listarContasPagar, quitarConta } from '../controllers/financeiroController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

router.use(authenticateJWT);

// Listar contas a pagar, opcional status
router.get('/', listarContasPagar);

// Quitar conta - apenas perfis de FINANCEIRO ou ADMIN por enquanto
router.patch('/:id/quitar', authorize(['FINANCEIRO', 'ADMIN']), quitarConta);

export default router; 