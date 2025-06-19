import { Router } from 'express';
import { createUsuario, getUsuarios, createUsuarioAdmin } from '../controllers/usuarioController';
import { authenticateJWT, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Rota pública para criar usuário comum (se necessário)
router.post('/usuario', authenticateJWT, createUsuario);

// Rotas que requerem privilégios de admin
router.get('/usuario', authenticateJWT, isAdmin, getUsuarios);
router.post('/usuario/admin', authenticateJWT, isAdmin, createUsuarioAdmin);

export default router; 