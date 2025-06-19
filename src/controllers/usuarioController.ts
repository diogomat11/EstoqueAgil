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
  const { nome, cpf, departamento, ramal, email, perfil } = req.body;
  
  console.log('Iniciando cadastro de usuário admin:', { nome, email, perfil, departamento });
  
  try {
    console.log('Tentando criar usuário no Supabase Auth...');
    // Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: '12345678', // senha padrão, admin pode alterar depois
      email_confirm: true
    });

    if (authError) {
      console.error('Erro ao criar usuário no Supabase Auth:', authError);
      res.status(400).json({ error: 'Erro ao criar usuário no Auth', details: authError });
      return;
    }

    console.log('Usuário criado com sucesso no Supabase Auth:', authData);

    try {
      console.log('Tentando inserir usuário no banco de dados...');
      // Cria usuário na tabela usuario
      const result = await pool.query(
        'INSERT INTO usuario (nome, cpf, departamento, ramal, email, perfil) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [nome, cpf, departamento, ramal, email, perfil]
      );
      
      console.log('Usuário inserido com sucesso no banco:', result.rows[0]);
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      console.error('Erro ao inserir usuário no banco:', err);
      // Retorna erro detalhado do banco
      res.status(500).json({ error: 'Erro ao inserir no banco', details: err });
    }
  } catch (err: any) {
    console.error('Erro inesperado ao criar usuário:', err);
    // Retorna erro inesperado
    res.status(500).json({ error: 'Erro inesperado', details: err });
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