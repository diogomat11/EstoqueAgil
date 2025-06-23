import { Router } from 'express';
import { 
  getUsuarios, 
  createUsuarioAdmin, 
  updateUsuario,
  toggleAtivoUsuario,
  getUsuarioByEmail
} from '../controllers/usuarioController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

// Rotas que requerem privilégios de admin
router.get('/', authenticateJWT, authorize(['ADMIN']), getUsuarios);
router.post('/admin', authenticateJWT, authorize(['ADMIN']), createUsuarioAdmin);
router.put('/:id', authenticateJWT, authorize(['ADMIN']), updateUsuario);
router.put('/:id/toggle-ativo', authenticateJWT, authorize(['ADMIN']), toggleAtivoUsuario);

// Rota para obter um usuário específico por email (exemplo, protegida)
router.get('/email/:email', authenticateJWT, authorize(['ADMIN']), getUsuarioByEmail);

// Rota pública para criar usuário comum (se necessário)
// router.post('/usuario', createUsuario);

// Rota para obter detalhes do usuário logado (exemplo)
// router.get('/me', authenticateJWT, getMe);

export default router; 