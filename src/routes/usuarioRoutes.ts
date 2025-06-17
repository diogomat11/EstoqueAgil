import { Router } from 'express';
import { createUsuario, getUsuarios } from '../controllers/usuarioController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.post('/usuario', authenticateJWT, createUsuario);
router.get('/usuario', authenticateJWT, getUsuarios);

export default router; 