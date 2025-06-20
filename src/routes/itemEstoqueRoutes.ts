import { Router } from 'express';
import {
  createItem,
  getItens,
  getItemById,
  updateItem,
  deleteItem
} from '../controllers/itemController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', createItem);
router.get('/', getItens);
router.get('/:id', getItemById);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

export default router; 