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

// Configuração do CORS
app.use(cors({
  origin: '*', // Permite todas as origens em desenvolvimento
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware para logs de requisição
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  if (req.method !== 'GET') {
    console.log('Body:', req.body);
  }
  next();
});

app.use(express.json());

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'API do GestorEstoque está funcionando!',
    version: '1.0.0'
  });
});

// Rotas da API
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

// Middleware de erro global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: err.message
  });
});

export default app;
