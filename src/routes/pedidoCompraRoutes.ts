import { Router } from 'express';
import { gerarPedidoCompra, listarPedidosCompra, atualizarStatusPedidoCompra } from '../controllers/pedidoCompraController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

router.post('/pedido-compra', authenticateJWT, gerarPedidoCompra);
router.get('/pedido-compra', authenticateJWT, listarPedidosCompra);
router.patch('/pedido-compra/:id/status', authenticateJWT, authorize(['APROVADOR', 'ADMIN']), atualizarStatusPedidoCompra);

export default router; 