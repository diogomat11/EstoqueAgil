import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import empresaRoutes from './routes/empresaRoutes';
import filialRoutes from './routes/filialRoutes';
import usuarioRoutes from './routes/usuarioRoutes';
import fornecedorRoutes from './routes/fornecedorRoutes';
import itemRoutes from './routes/itemRoutes';
import importRoutes from './routes/importRoutes';
import requisicaoRoutes from './routes/requisicaoRoutes';
import movimentacaoRoutes from './routes/movimentacaoRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import orcamentoRoutes from './routes/orcamentoRoutes';
import pedidoCompraRoutes from './routes/pedidoCompraRoutes';
import notificacaoRoutes from './routes/notificacaoRoutes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rotas aqui
app.use('/api', healthRouter);
app.use('/api', empresaRoutes);
app.use('/api', filialRoutes);
app.use('/api', usuarioRoutes);
app.use('/api', fornecedorRoutes);
app.use('/api', itemRoutes);
app.use('/api', importRoutes);
app.use('/api', requisicaoRoutes);
app.use('/api', movimentacaoRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', orcamentoRoutes);
app.use('/api', pedidoCompraRoutes);
app.use('/api', notificacaoRoutes);

export default app;
