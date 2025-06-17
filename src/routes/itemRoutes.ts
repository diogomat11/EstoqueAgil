import { Router } from 'express';
import { createItem, getItens } from '../controllers/itemController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.post('/item', authenticateJWT, createItem);
router.get('/item', authenticateJWT, getItens);

export default router; 