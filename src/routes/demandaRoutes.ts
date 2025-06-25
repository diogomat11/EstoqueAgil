import { Router } from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';
import { criarDemanda, getDemandas, getDemandaById, updateDemanda, deleteDemanda } from '../controllers/demandaController';

console.log('[ROUTES] Carregando rotas de Demandas (DSO)...');

const router = Router();

router.use(authenticateJWT);

// Criar demanda - qualquer usuário logado
router.post('/', criarDemanda);

// Listar demandas / Obter por id - qualquer usuário logado
router.get('/', getDemandas);
router.get('/:id', getDemandaById);

// Atualizar ou deletar demanda - apenas ADMIN
router.put('/:id', authorize(['ADMIN']), updateDemanda);
router.delete('/:id', authorize(['ADMIN']), deleteDemanda);

export default router; 