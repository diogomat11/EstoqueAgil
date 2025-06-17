import { Router } from 'express';
import { createEmpresa, getEmpresas } from '../controllers/empresaController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.post('/empresa', authenticateJWT, createEmpresa);
router.get('/empresa', authenticateJWT, getEmpresas);

export default router; 