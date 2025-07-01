import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import healthRoutes from './routes/health';
import usuarioRoutes from './routes/usuarioRoutes';
import fornecedorRoutes from './routes/fornecedorRoutes';
import importRoutes from './routes/importRoutes';
import requisicaoRoutes from './routes/requisicaoRoutes';
import orcamentoRoutes from './routes/orcamentoRoutes';
import itemEstoqueRoutes from './routes/itemEstoqueRoutes';
import categoriaRoutes from './routes/categoriaRoutes';
import negociacaoRoutes from './routes/negociacaoRoutes';
import movimentacaoRoutes from './routes/movimentacaoRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import pedidoCompraRoutes from './routes/pedidoCompraRoutes';
import notificacaoRoutes from './routes/notificacaoRoutes';
import filialRoutes from './routes/filialRoutes';
import auditoriaRoutes from './routes/auditoriaRoutes';
import demandaRoutes from './routes/demandaRoutes';
import estoqueRoutes from './routes/estoqueRoutes';

dotenv.config();

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Rotas da API
app.use('/health', healthRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use('/api/import', importRoutes);
app.use('/api/requisicoes', requisicaoRoutes);
app.use('/api/orcamentos', orcamentoRoutes);
app.use('/api/item_estoque', itemEstoqueRoutes);

console.log('[ROUTES] Carregando rotas de Categorias...');
app.use('/api/categorias', categoriaRoutes);

app.use('/api/negociacoes', negociacaoRoutes);
app.use('/api/movimentacoes', movimentacaoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pedidos', pedidoCompraRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/filiais', filialRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/demandas', demandaRoutes);
app.use('/api/estoque', estoqueRoutes);

app.get('/', (req, res) => {
  res.send('Estoque Agil API is running!');
});

export default app;
