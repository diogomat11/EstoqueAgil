import { Router } from 'express';
import {
  createItem,
  getItens,
  getItemById,
  updateItem,
  deleteItem
} from '../controllers/itemController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

console.log('[ROUTES] Carregando rotas de Itens de Estoque...');

const router = Router();

router.use(authenticateJWT);

router.post('/', authorize(['ADMIN']), createItem);
router.get('/', getItens);
router.get('/:id', getItemById);
router.put('/:id', authorize(['ADMIN']), updateItem);
router.delete('/:id', authorize(['ADMIN']), deleteItem);

export default router; 