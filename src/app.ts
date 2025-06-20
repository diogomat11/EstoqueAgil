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

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/health', healthRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use('/api/import', importRoutes);
app.use('/api/requisicao', requisicaoRoutes);
app.use('/api/orcamento', orcamentoRoutes);
app.use('/api/item_estoque', itemEstoqueRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/negociacoes', negociacaoRoutes);
app.use('/api/movimentacoes', movimentacaoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pedidos', pedidoCompraRoutes);
app.use('/api/notificacoes', notificacaoRoutes);


app.get('/', (req, res) => {
  res.send('Estoque Agil API is running!');
});

export default app;
