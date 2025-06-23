import { Router } from 'express';
import { createFilial, getFiliais } from '../controllers/filialController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

router.post('/', authenticateJWT, authorize(['ADMIN']), createFilial);
router.get('/', authenticateJWT, getFiliais);

export default router; 