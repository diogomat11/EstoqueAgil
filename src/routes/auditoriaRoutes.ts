import { Router } from 'express';
import { listarAuditoria } from '../controllers/auditoriaController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();
router.get('/auditoria', authenticateJWT, authorize(['ADMIN']), listarAuditoria);
export default router; 