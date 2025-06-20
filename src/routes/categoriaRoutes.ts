import { Router } from 'express';
import { createCategoria, getCategorias, updateCategoria, deleteCategoria } from '../controllers/categoriaController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.get('/categorias', authenticateJWT, getCategorias);
router.post('/categorias', authenticateJWT, createCategoria);
router.put('/categorias/:id', authenticateJWT, updateCategoria);
router.delete('/categorias/:id', authenticateJWT, deleteCategoria);

export default router; 