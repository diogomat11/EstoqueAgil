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
        'INSERT INTO usuario (nome, cpf, departamento, ramal, email, perfil, ativo) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *',
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
    console.error('Erro não tratado:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: err.message
    });
  }
};

export const updateUsuario = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { nome, cpf, departamento, ramal, perfil } = req.body;
  
  try {
    // Verificar se o usuário existe
    const existingUser = await pool.query(
      'SELECT * FROM usuario WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({ 
        error: 'Usuário não encontrado',
        details: { message: 'Usuário não existe no banco de dados' }
      });
      return;
    }

    // Atualizar usuário no banco local
    const result = await pool.query(
      `UPDATE usuario 
       SET nome = $1, cpf = $2, departamento = $3, ramal = $4, perfil = $5, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 
       RETURNING *`,
      [nome, cpf, departamento, ramal, perfil, id]
    );

    // Atualizar metadados no Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.rows[0].auth_id,
      {
        user_metadata: {
          nome,
          perfil
        }
      }
    );

    if (authError) {
      console.error('Erro ao atualizar usuário no Supabase Auth:', authError);
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ 
      error: 'Erro ao atualizar usuário',
      details: err.message
    });
  }
};

export const toggleAtivoUsuario = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Verificar se o usuário existe
    const existingUser = await pool.query(
      'SELECT * FROM usuario WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({ 
        error: 'Usuário não encontrado',
        details: { message: 'Usuário não existe no banco de dados' }
      });
      return;
    }

    // Alternar o status ativo
    const novoStatus = !existingUser.rows[0].ativo;

    // Atualizar status no banco local
    const result = await pool.query(
      `UPDATE usuario 
       SET ativo = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 
       RETURNING *`,
      [novoStatus, id]
    );

    // Se estiver inativando, desabilitar no Supabase Auth também
    if (!novoStatus && existingUser.rows[0].auth_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.rows[0].auth_id,
        { ban_duration: '876000h' } // ~100 anos
      );

      if (authError) {
        console.error('Erro ao desabilitar usuário no Supabase Auth:', authError);
      }
    }
    // Se estiver ativando, reabilitar no Supabase Auth
    else if (novoStatus && existingUser.rows[0].auth_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.rows[0].auth_id,
        { ban_duration: undefined }
      );

      if (authError) {
        console.error('Erro ao reabilitar usuário no Supabase Auth:', authError);
      }
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ 
      error: 'Erro ao alterar status do usuário',
      details: err.message
    });
  }
};

export const getUsuarioByEmail = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.params;
  console.log(`[AUTH_FLOW] Buscando usuário no banco de dados local com o email: ${email}`);
  
  try {
    const result = await pool.query('SELECT * FROM usuario WHERE LOWER(email) = LOWER($1)', [email]);
    
    if (result.rows.length === 0) {
      console.error(`[AUTH_FLOW] Usuário com email ${email} NÃO ENCONTRADO no banco de dados local.`);
      res.status(404).json({ error: 'Usuário não encontrado' });
    } else {
      console.log(`[AUTH_FLOW] Usuário com email ${email} encontrado com sucesso. Perfil: ${result.rows[0].perfil}`);
      res.json(result.rows[0]);
    }
  } catch (err: any) {
    console.error(`[AUTH_FLOW] Erro no banco de dados ao buscar por email ${email}:`, err);
    res.status(500).json({ error: err.message });
  }
};

export const getUsuarios = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM usuario ORDER BY nome');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 