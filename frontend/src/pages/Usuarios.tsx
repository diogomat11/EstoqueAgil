import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { theme } from '../styles/theme';
import axios from 'axios';
import api from '../lib/api';

const perfis = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'orcamentista', label: 'Orçamentista' },
  { value: 'operacional', label: 'Operacional' },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    nome: '', 
    email: '', 
    perfil: 'operacional', 
    departamento: '', 
    ramal: '', 
    cpf: '',
    senha: '',
    ativo: true 
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user));
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token || null));
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/usuarios');
      setUsuarios(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm({ 
      nome: '', 
      email: '', 
      perfil: 'operacional', 
      departamento: '', 
      ramal: '', 
      cpf: '',
      senha: '',
      ativo: true 
    });
    setEditingUser(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleEdit = (usuario: any) => {
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      departamento: usuario.departamento || '',
      ramal: usuario.ramal || '',
      cpf: usuario.cpf || '',
      senha: usuario.senha || '',
      ativo: usuario.ativo
    });
    setEditingUser(usuario);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleToggleAtivo = async (usuario: any) => {
    try {
      setActionLoading(usuario.id);
      await api.put(`/usuarios/${usuario.id}/toggle-ativo`);
      setSuccess(`Usuário ${usuario.ativo ? 'inativado' : 'ativado'} com sucesso!`);
      fetchUsuarios();
    } catch (err: any) {
      setError(`Erro ao ${usuario.ativo ? 'inativar' : 'ativar'} usuário: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!token) {
      setError('Token de autenticação não encontrado. Faça login novamente.');
      return;
    }
    
    try {
      const response = editingUser 
        ? await api.put(`/usuarios/${editingUser.id}`, form)
        : await api.post('/usuarios/admin', form);
      
      setSuccess(editingUser ? 'Usuário atualizado com sucesso!' : `Usuário cadastrado! Senha: ${response.data.senha_inicial}`);
      resetForm();
      fetchUsuarios();
    } catch (err: any) {
      let errorMessage = editingUser ? 'Erro ao atualizar usuário.' : 'Erro ao cadastrar usuário.';
      
      if (err.response) {
        errorMessage = err.response.data?.details?.message || 
                      err.response.data?.error || 
                      `Erro ${err.response.status}: ${err.response.statusText}`;
      } else if (err.request) {
        errorMessage = 'Erro de conexão com o servidor. Verifique sua internet ou se o servidor está online.';
      } else {
        errorMessage = err.message;
      }
      
      setError(`Erro: ${errorMessage}`);
    }
  };

  // Permitir acesso apenas para admin
  if (!user) return <div>Carregando...</div>;
  if (user && user.email) {
    const usuarioLogado = usuarios.find(u => u.email === user.email);
    if (!usuarioLogado || usuarioLogado.perfil !== 'admin') {
      return <div style={{ color: 'red', padding: 32 }}>Acesso restrito ao administrador.</div>;
    }
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ color: theme.colors.blueDark1 }}>Usuários</h1>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            style={{ 
              background: theme.colors.blueDark1, 
              color: '#fff', 
              padding: '10px 20px', 
              border: 'none', 
              borderRadius: 4, 
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Incluir Usuário
          </button>
        )}
      </div>

      {error && (
        <div style={{ 
          padding: '12px 16px',
          background: '#FFF5F5',
          color: '#C53030',
          borderRadius: 8,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          padding: '12px 16px',
          background: '#F0FFF4',
          color: '#2F855A',
          borderRadius: 8,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>✅</span>
          {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 32, background: theme.colors.blueLight, padding: 24, borderRadius: 8, maxWidth: 500 }}>
          <h2 style={{ marginBottom: 16 }}>{editingUser ? 'Editar usuário' : 'Cadastrar novo usuário'}</h2>
          <input 
            name="nome" 
            placeholder="Nome" 
            value={form.nome} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} 
          />
          <input 
            name="email" 
            placeholder="E-mail" 
            value={form.email} 
            onChange={handleChange} 
            required 
            type="email" 
            style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} 
            disabled={!!editingUser}
          />
          <input 
            name="cpf" 
            placeholder="CPF" 
            value={form.cpf} 
            onChange={handleChange} 
            style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} 
          />
          <input 
            name="departamento" 
            placeholder="Departamento" 
            value={form.departamento} 
            onChange={handleChange} 
            style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} 
          />
          <input 
            name="ramal" 
            placeholder="Ramal" 
            value={form.ramal} 
            onChange={handleChange} 
            style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} 
          />
          <div style={{ marginBottom: 16 }}>
            <label style={{display:'block',marginBottom:4}}>Senha Inicial (opcional)</label>
            <input name="senha" type="text" value={form.senha} onChange={handleChange} style={{width:'100%',padding:8,border:'1px solid #ccc',borderRadius:4}} />
          </div>
          <select 
            name="perfil" 
            value={form.perfil} 
            onChange={handleChange} 
            style={{ width: '100%', marginBottom: 16, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          >
            {perfis.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              type="submit" 
              style={{ 
                flex: 1,
                background: theme.colors.blueDark1, 
                color: '#fff', 
                padding: 10, 
                border: 'none', 
                borderRadius: 4, 
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {editingUser ? 'Atualizar' : 'Cadastrar'}
            </button>
            <button 
              type="button" 
              onClick={resetForm}
              style={{ 
                flex: 1,
                background: '#fff', 
                color: theme.colors.blueDark1, 
                padding: 10, 
                border: `1px solid ${theme.colors.blueDark1}`, 
                borderRadius: 4, 
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: theme.colors.blueDark1 }}>
          Carregando usuários...
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme.colors.blueLight1 }}>
                <th style={{ padding: 12, textAlign: 'left', color: theme.colors.blueDark1 }}>Nome</th>
                <th style={{ padding: 12, textAlign: 'left', color: theme.colors.blueDark1 }}>E-mail</th>
                <th style={{ padding: 12, textAlign: 'left', color: theme.colors.blueDark1 }}>Perfil</th>
                <th style={{ padding: 12, textAlign: 'left', color: theme.colors.blueDark1 }}>Departamento</th>
                <th style={{ padding: 12, textAlign: 'left', color: theme.colors.blueDark1 }}>Ramal</th>
                <th style={{ padding: 12, textAlign: 'left', color: theme.colors.blueDark1 }}>Status</th>
                <th style={{ padding: 12, textAlign: 'center', color: theme.colors.blueDark1 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 12 }}>{u.nome}</td>
                  <td style={{ padding: 12 }}>{u.email}</td>
                  <td style={{ padding: 12 }}>{perfis.find(p => p.value === u.perfil)?.label || u.perfil}</td>
                  <td style={{ padding: 12 }}>{u.departamento}</td>
                  <td style={{ padding: 12 }}>{u.ramal}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ 
                      color: u.ativo ? '#2F855A' : '#C53030',
                      background: u.ativo ? '#F0FFF4' : '#FFF5F5',
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 500
                    }}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEdit(u)}
                        style={{ 
                          background: theme.colors.blueLight1,
                          color: theme.colors.blueDark1,
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 500,
                          transition: 'all 0.2s'
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleAtivo(u)}
                        disabled={actionLoading === u.id}
                        style={{ 
                          background: u.ativo ? '#FFF5F5' : '#F0FFF4',
                          color: u.ativo ? '#C53030' : '#2F855A',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 4,
                          cursor: actionLoading === u.id ? 'wait' : 'pointer',
                          fontSize: 14,
                          fontWeight: 500,
                          opacity: actionLoading === u.id ? 0.7 : 1,
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {actionLoading === u.id ? (
                          <>
                            <span style={{ 
                              display: 'inline-block',
                              width: 12,
                              height: 12,
                              border: `2px solid ${u.ativo ? '#FFF5F5' : '#F0FFF4'}`,
                              borderTop: `2px solid ${u.ativo ? '#C53030' : '#2F855A'}`,
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }}></span>
                            {u.ativo ? 'Inativando...' : 'Ativando...'}
                          </>
                        ) : (
                          u.ativo ? 'Inativar' : 'Ativar'
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          button:hover:not(:disabled) {
            filter: brightness(0.9);
          }
        `}
      </style>
    </div>
  );
};

export default Usuarios; 