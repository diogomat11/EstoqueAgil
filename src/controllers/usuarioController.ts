import { Request, Response } from 'express';
import { pool } from '../database';
import { supabaseAdmin } from '../utils/supabaseAdmin';

export const createUsuario = async (req: Request, res: Response): Promise<void> => {
  const { nome, cpf, departamento, ramal } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO usuario (nome, cpf, departamento, ramal) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, cpf, departamento, ramal]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createUsuarioAdmin = async (req: Request, res: Response): Promise<void> => {
  console.log('=== Iniciando createUsuarioAdmin ===');
  console.log('Headers recebidos:', req.headers);
  console.log('Dados recebidos:', req.body);
  console.log('Configuração Supabase:', {
    url: process.env.SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY
  });
  
  const { nome, cpf, departamento, ramal, email, perfil } = req.body;
  
  if (!email || !nome || !perfil) {
    console.error('Dados obrigatórios faltando:', { email, nome, perfil });
    res.status(400).json({ 
      error: 'Dados obrigatórios faltando',
      details: { 
        message: 'Email, nome e perfil são obrigatórios',
        received: { email, nome, perfil }
      }
    });
    return;
  }
  
  try {
    // Primeiro, verificar se o usuário já existe no Supabase Auth
    console.log('1. Verificando se usuário já existe no Supabase Auth...');
    const { data: existingUser, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Erro ao listar usuários no Supabase:', listError);
      res.status(500).json({ 
        error: 'Erro ao verificar usuários existentes',
        details: listError
      });
      return;
    }
    
    const userExists = existingUser?.users.some(u => u.email === email);
    
    if (userExists) {
      console.error('Usuário já existe no Supabase Auth:', email);
      res.status(400).json({ 
        error: 'Usuário já existe',
        details: { message: 'Email já cadastrado' }
      });
      return;
    }

    // Criar usuário no Supabase Auth
    console.log('2. Criando usuário no Supabase Auth...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: '12345678', // senha padrão
      email_confirm: true,
      user_metadata: {
        nome,
        perfil
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário no Supabase Auth:', authError);
      res.status(400).json({ 
        error: 'Erro ao criar usuário no Auth',
        details: authError
      });
      return;
    }

    console.log('3. Usuário criado com sucesso no Supabase Auth:', {
      id: authData.user.id,
      email: authData.user.email
    });

    try {
      // Verificar se já existe no banco local
      console.log('4. Verificando se usuário já existe no banco local...');
      const existingDBUser = await pool.query(
        'SELECT * FROM usuario WHERE email = $1',
        [email]
      );

      if (existingDBUser.rows.length > 0) {
        console.error('Usuário já existe no banco local:', email);
        res.status(400).json({ 
          error: 'Usuário já existe no banco',
          details: { message: 'Email já cadastrado no banco de dados' }
        });
        return;
      }

      // Inserir no banco local
      console.log('5. Inserindo usuário no banco local...');
      const result = await pool.query(
        'INSERT INTO usuario (nome, cpf, departamento, ramal, email, perfil) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [nome, cpf, departamento, ramal, email, perfil]
      );
      
      console.log('6. Usuário inserido com sucesso no banco local:', {
        id: result.rows[0].id,
        email: result.rows[0].email,
        perfil: result.rows[0].perfil
      });
      
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      console.error('Erro ao inserir usuário no banco local:', err);
      // Se falhou ao inserir no banco local, remover do Supabase Auth
      console.log('7. Removendo usuário do Supabase Auth devido a falha no banco local...');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      res.status(500).json({ 
        error: 'Erro ao inserir no banco',
        details: {
          message: err.message,
          constraint: err.constraint,
          detail: err.detail
        }
      });
    }
  } catch (err: any) {
    console.error('Erro inesperado ao criar usuário:', err);
    res.status(500).json({ 
      error: 'Erro inesperado',
      details: {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }
    });
  }
};

export const getUsuarios = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM usuario');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 