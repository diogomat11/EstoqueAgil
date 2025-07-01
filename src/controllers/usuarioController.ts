import { Request, Response } from 'express';
import { pool } from '../database';
import { supabaseAdmin } from '../utils/supabaseAdmin';
import crypto from 'crypto';

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
  
  const { nome, cpf, departamento, ramal, email, perfil, senha } = req.body;
  
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
  
  const senhaInicial = senha || crypto.randomBytes(4).toString('hex'); // 8 chars
  
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
      password: senhaInicial,
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
        'INSERT INTO usuario (nome, cpf, departamento, ramal, email, perfil, ativo, mudar_senha, auth_id) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7) RETURNING *',
        [nome, cpf, departamento, ramal, email, perfil, authData.user.id]
      );
      
      console.log('6. Usuário inserido com sucesso no banco local:', {
        id: result.rows[0].id,
        email: result.rows[0].email,
        perfil: result.rows[0].perfil
      });
      
      res.status(201).json({ ...result.rows[0], senha_inicial: senhaInicial });
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
  const { nome, cpf, departamento, ramal, perfil, senha } = req.body;
  
  try {
    console.log('[USUARIOS] updateUsuario id param:', id);
    // Verificar se o usuário existe
    const existingUser = await pool.query(
      'SELECT * FROM usuario WHERE id = $1',
      [id]
    );
    console.log('[USUARIOS] existing rows:', existingUser.rowCount);

    if (existingUser.rows.length === 0) {
      res.status(404).json({ 
        error: 'Usuário não encontrado',
        details: { message: 'Usuário não existe no banco de dados' }
      });
      return;
    }

    console.log('[USUARIOS] updateUsuario senha recebida:', senha);
    console.log('[USUARIOS] updateUsuario auth_id existente:', existingUser.rows[0].auth_id);

    // === Atualização de senha no Supabase Auth ===
    if (senha) {
      let authIdToUse: string | undefined = existingUser.rows[0].auth_id;

      // Caso a coluna auth_id esteja vazia, tentar descobrir pelo e-mail
      if (!authIdToUse) {
        const emailUsuario = existingUser.rows[0].email;
        console.log('[USUARIOS] auth_id ausente. Buscando usuário no Supabase Auth pelo email:', emailUsuario);

        const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (listErr) {
          console.error('Erro ao listar usuários no Supabase Auth:', listErr);
        } else {
          const foundUser = listData.users.find((u) => u.email && u.email.toLowerCase() === emailUsuario.toLowerCase());
          if (foundUser) {
            authIdToUse = foundUser.id;
            await pool.query('UPDATE usuario SET auth_id = $1 WHERE id = $2', [authIdToUse, id]);
            console.log('[USUARIOS] auth_id atualizado no banco para', authIdToUse);
          } else {
            console.warn('Usuário não encontrado no Supabase Auth. Impossível atualizar senha.');
          }
        }
      }

      if (authIdToUse) {
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(authIdToUse, { password: senha });
        if (updErr) {
          console.error('Erro ao atualizar senha no Supabase Auth:', updErr);
        } else {
          await pool.query('UPDATE usuario SET mudar_senha = false WHERE id = $1', [id]);
        }
      }
    }

    // Atualizar metadados no Supabase Auth se o usuário possuir auth_id válido (UUID)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const authId = existingUser.rows[0].auth_id;
    if (authId && uuidRegex.test(authId)) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authId, {
        user_metadata: { nome, perfil }
      });
      if (authError) {
        console.error('Erro ao atualizar usuário no Supabase Auth:', authError);
      }
    }

    res.json(existingUser.rows[0]);
  } catch (err: any) {
    console.error('[USUARIOS] Erro no updateUsuario:', err);
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

    // ------ Integração com Supabase Auth ------
    if (existingUser.rows[0].auth_id) {
      try {
        if (!novoStatus) {
          // Desabilitar usuário
          const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.rows[0].auth_id,
            { ban_duration: '876000h' }
          );
          if (authError) {
            console.error('Erro ao desabilitar usuário no Supabase Auth:', authError);
          }
        } else {
          // Reabilitar usuário
          const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.rows[0].auth_id,
            { ban_duration: 'none' }
          );
          if (authError) {
            console.error('Erro ao reabilitar usuário no Supabase Auth:', authError);
          }
        }
      } catch (supabaseErr: any) {
        // Não bloquear a operação caso o Supabase falhe; apenas logar
        console.error('Exceção ao comunicar com Supabase Auth:', supabaseErr);
      }
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    // Logs detalhados para diagnóstico
    console.error('[USUARIOS] toggleAtivoUsuario ERRO:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      constraint: err.constraint,
      stack: err.stack,
    });

    res.status(500).json({ 
      error: 'Erro ao alterar status do usuário',
      details: err.message,
      pgCode: err.code,
      pgDetail: err.detail,
      pgConstraint: err.constraint
    });
  }
};

export const getUsuarioByEmail = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.params;
  const requester = (req as any).user; // setado pelo authenticateJWT

  if (!requester) {
    res.status(401).json({ error: 'Usuário não autenticado.' });
    return;
  }

  const isAdmin = (requester.perfil?.toUpperCase() || '').includes('ADMIN');
  const isSelf = requester.email?.toLowerCase() === email.toLowerCase();

  if (!isAdmin && !isSelf) {
    res.status(403).json({ error: 'Acesso negado.' });
    return;
  }

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

export const alterarSenhaUsuarioLogado = async (req: Request, res: Response): Promise<void> => {
  const { nova_senha } = req.body;
  const userDb = (req as any).user;
  const authUser = (req as any).authUser;
  if (!nova_senha) {
    res.status(400).json({ error: 'nova_senha obrigatória' });
    return;
  }
  try {
    // Determina o ID a ser usado (UUID do Auth)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    let authId: string | undefined = userDb?.auth_id;
    if (!authId || !uuidRegex.test(authId)) {
      // Fallback: pegar do usuário autenticado pelo token
      authId = authUser?.id;
    }
    if (!authId) {
      res.status(400).json({ error: 'Usuário não possui vínculo válido com Supabase Auth.' });
      return;
    }

    // Atualiza senha no Supabase Auth
    await supabaseAdmin.auth.admin.updateUserById(authId, { password: nova_senha });
    // Marca mudar_senha false
    await pool.query('UPDATE usuario SET mudar_senha = false WHERE id = $1', [userDb.id]);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getUsuarioById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM usuario WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Usuário não encontrado' });
    } else {
      res.json(rows[0]);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 