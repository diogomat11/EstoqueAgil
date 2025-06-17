import { Router } from 'express';
import { importFornecedores, importFiliais, importItens } from '../controllers/importController';

const router = Router();

router.post('/import/fornecedores', importFornecedores);
router.post('/import/filiais', importFiliais);
router.post('/import/itens', importItens);

export default router; 