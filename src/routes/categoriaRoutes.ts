import { Router } from 'express';
import { createCategoria, getCategorias, updateCategoria, deleteCategoria } from '../controllers/categoriaController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

router.get('/', authenticateJWT, getCategorias);
router.post('/', authenticateJWT, authorize(['ADMIN']), createCategoria);
router.put('/:id', authenticateJWT, authorize(['ADMIN']), updateCategoria);
router.delete('/:id', authenticateJWT, authorize(['ADMIN']), deleteCategoria);

export default router; 