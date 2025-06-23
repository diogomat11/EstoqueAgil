import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('[DATABASE] URL do banco de dados não configurada!');
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000, // tempo máximo que uma conexão pode ficar inativa
  connectionTimeoutMillis: 10000 // tempo máximo para estabelecer uma conexão
});

// Teste inicial da conexão
pool.connect()
  .then(client => {
    console.log('[DATABASE] Conexão com o banco de dados estabelecida com sucesso');
    client.release();
  })
  .catch(err => {
    console.error('[DATABASE] Erro ao conectar com o banco de dados:', err.message);
    process.exit(1);
  });

// Monitoramento do pool de conexões
pool.on('error', (err) => {
  console.error('[DATABASE] Erro inesperado no pool de conexões:', err.message);
});

pool.on('connect', () => {
  console.log('[DATABASE] Nova conexão estabelecida no pool');
});

pool.on('remove', () => {
  console.log('[DATABASE] Conexão removida do pool');
});
