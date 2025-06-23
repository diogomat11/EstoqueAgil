import { Router } from 'express';
import { 
    criarRequisicao, 
    getRequisicoes, 
    getRequisicaoById, 
    atualizarStatusRequisicao, 
    updateRequisicao,
    deleteRequisicao
} from '../controllers/requisicaoController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

console.log('[ROUTES] Carregando rotas de Requisições...');

const router = Router();

router.use(authenticateJWT);

// Qualquer usuário logado pode criar uma requisição
router.post('/', criarRequisicao);

// Rotas para obter requisições
router.get('/', getRequisicoes);
router.get('/:id', getRequisicaoById);

// Apenas Admin pode atualizar a requisição inteira
router.put('/:id', authorize(['ADMIN']), updateRequisicao);

// Apenas Admin pode deletar uma requisição
router.delete('/:id', authorize(['ADMIN']), deleteRequisicao);

// Apenas Aprovador ou Admin podem mudar o status
router.patch('/:id/status', authorize(['APROVADOR', 'ADMIN']), atualizarStatusRequisicao);

export default router;
