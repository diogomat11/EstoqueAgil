import { Router } from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { historicoComprasConsumo, leadTimeMedio, ultimoPrecoCompra } from '../controllers/compraAnaliseController';

console.log('[ROUTES] Carregando rotas de Compras...');

const router = Router();
router.use(authenticateJWT);

router.get('/historico', historicoComprasConsumo);
router.get('/leadtime', leadTimeMedio);
router.get('/ultimopreco', ultimoPrecoCompra);

export default router; 