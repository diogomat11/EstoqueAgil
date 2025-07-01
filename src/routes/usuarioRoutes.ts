import { Router } from 'express';
import { 
  getUsuarios, 
  createUsuarioAdmin, 
  updateUsuario,
  toggleAtivoUsuario,
  getUsuarioByEmail,
  alterarSenhaUsuarioLogado,
  getUsuarioById
} from '../controllers/usuarioController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

// Rotas que requerem privilégios de admin
router.get('/', authenticateJWT, authorize(['ADMIN']), getUsuarios);
router.post('/admin', authenticateJWT, authorize(['ADMIN']), createUsuarioAdmin);
router.get('/email/:email', authenticateJWT, getUsuarioByEmail);
router.get('/:id', authenticateJWT, authorize(['ADMIN']), getUsuarioById);
router.put('/:id', authenticateJWT, authorize(['ADMIN']), updateUsuario);
router.put('/:id/toggle-ativo', authenticateJWT, authorize(['ADMIN']), toggleAtivoUsuario);

// Rota pública para criar usuário comum (se necessário)
// router.post('/usuario', createUsuario);

// Rota para obter detalhes do usuário logado (exemplo)
// router.get('/me', authenticateJWT, getMe);

router.patch('/alterar-senha', authenticateJWT, alterarSenhaUsuarioLogado);

export default router; 