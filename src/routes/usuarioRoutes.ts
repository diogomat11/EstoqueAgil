import { Router } from 'express';
import { createUsuario, getUsuarios, createUsuarioAdmin } from '../controllers/usuarioController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.post('/usuario', authenticateJWT, createUsuario);
router.get('/usuario', authenticateJWT, getUsuarios);
router.post('/usuario/admin', authenticateJWT, createUsuarioAdmin);

export default router; 