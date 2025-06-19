import { Router } from 'express';
import { 
  createUsuario, 
  getUsuarios, 
  createUsuarioAdmin, 
  updateUsuario,
  toggleAtivoUsuario 
} from '../controllers/usuarioController';
import { authenticateJWT, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Rotas que requerem privilégios de admin
router.get('/usuario', authenticateJWT, isAdmin, getUsuarios);
router.post('/usuario/admin', authenticateJWT, isAdmin, createUsuarioAdmin);
router.put('/usuario/:id', authenticateJWT, isAdmin, updateUsuario);
router.put('/usuario/:id/toggle-ativo', authenticateJWT, isAdmin, toggleAtivoUsuario);

// Rota pública para criar usuário comum (se necessário)
router.post('/usuario', authenticateJWT, createUsuario);

export default router; 