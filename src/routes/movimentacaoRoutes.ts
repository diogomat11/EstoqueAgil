import { Router } from 'express';
import { registrarEntradaPorPedido, registrarEntradaManual, registrarSaidaManual, registrarRemanejamentoEstoque, listarMovimentacoes, getMovimentacaoById, getEstoqueDisponivelFilial } from '../controllers/movimentacaoController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = Router();

// Aplica autenticação a todas as rotas de movimentação
router.use(authenticateJWT);

// Rota para buscar o histórico de movimentações
router.get('/', listarMovimentacoes);

// Estoque disponível por filial (deve vir antes da rota :id para não haver conflito)
router.get('/estoque-disponivel/:filialId', authorize(['ALMOXARIFADO','SUPERVISOR','ADMIN']), getEstoqueDisponivelFilial);

// Rota para registrar a entrada de um pedido de compra no estoque.
// Apenas perfis de almoxarifado ou admin podem realizar esta ação.
router.post('/entrada', authorize(['ADMIN', 'ALMOXARIFADO']), registrarEntradaPorPedido);

// Entrada manual (apenas supervisor ou admin)
router.post('/entrada-manual', authorize(['SUPERVISOR','ADMIN']), registrarEntradaManual);

// Saída de estoque
router.post('/saida', authorize(['ALMOXARIFADO','SUPERVISOR','ADMIN']), registrarSaidaManual);

// Remanejamento entre filiais
router.post('/remanejamento', authorize(['SUPERVISOR','ADMIN']), registrarRemanejamentoEstoque);

// Rota para buscar os detalhes de uma movimentação específica (deixar por último para não conflitar)
router.get('/:id', getMovimentacaoById);

// TODO: Adicionar rotas para listar movimentações aqui no futuro.

export default router; 