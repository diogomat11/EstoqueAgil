import { Router } from 'express';
import { createFilial, getFiliais } from '../controllers/filialController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.post('/filial', authenticateJWT, createFilial);
router.get('/filial', authenticateJWT, getFiliais);

export default router; 