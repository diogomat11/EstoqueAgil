import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;

// Função para inicializar o servidor
const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`[${new Date().toISOString()}] Servidor iniciado na porta ${PORT}`);
      console.log(`[${new Date().toISOString()}] Ambiente: ${process.env.NODE_ENV}`);
      console.log(`[${new Date().toISOString()}] URL do banco: ${process.env.DATABASE_URL ? 'Configurada' : 'Não configurada'}`);
      console.log(`[${new Date().toISOString()}] URL do Supabase: ${process.env.SUPABASE_URL ? 'Configurada' : 'Não configurada'}`);
    });

    // Tratamento de erros do servidor
    server.on('error', (error: any) => {
      console.error(`[${new Date().toISOString()}] Erro no servidor:`, error);
      process.exit(1);
    });

    // Tratamento de sinais de término
    process.on('SIGTERM', () => {
      console.log(`[${new Date().toISOString()}] Recebido sinal SIGTERM`);
      server.close(() => {
        console.log(`[${new Date().toISOString()}] Servidor encerrado graciosamente`);
        process.exit(0);
      });
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao iniciar servidor:`, error);
    process.exit(1);
  }
};

// Inicia o servidor
startServer().catch((error) => {
  console.error(`[${new Date().toISOString()}] Erro fatal:`, error);
  process.exit(1);
});
