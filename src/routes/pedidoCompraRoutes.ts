import { Router } from 'express';
import {
    listarPedidos,
    getPedidoById,
    atualizarStatusPedido
} from '../controllers/pedidoCompraController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

// Aplica autenticação a todas as rotas de pedidos
router.use(authenticateJWT);

// Rota para listar todos os pedidos de compra
router.get('/', listarPedidos);

// Rota para ver os detalhes de um pedido específico
router.get('/:id', getPedidoById);

// Rota para atualizar o status de um pedido
// Apenas perfis específicos (ex: 'COMPRADOR', 'ADMIN') poderão alterar o status.
router.patch('/:id/status', authorize(['ADMIN', 'COMPRADOR', 'ALMOXARIFADO']), atualizarStatusPedido);

export default router; 