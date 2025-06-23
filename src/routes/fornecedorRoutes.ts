import { Router } from 'express';
import {
  createFornecedor,
  getFornecedores,
  getFornecedorById,
  updateFornecedor,
  deleteFornecedor
} from '../controllers/fornecedorController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

console.log('[ROUTES] Carregando rotas de Fornecedores...');

const router = Router();

router.use(authenticateJWT);

router.post('/', authorize(['ADMIN']), createFornecedor);
router.get('/', getFornecedores);
router.get('/:id', getFornecedorById);
router.put('/:id', authorize(['ADMIN']), updateFornecedor);
router.delete('/:id', authorize(['ADMIN']), deleteFornecedor);

export default router; 