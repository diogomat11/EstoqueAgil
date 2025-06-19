import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { theme } from '../styles/theme';
import axios from 'axios';

const perfis = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'orcamentista', label: 'Orcamentista' },
  { value: 'operacional', label: 'Operacional' },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', email: '', perfil: 'operacional', departamento: '', ramal: '', cpf: '' });
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
    const { data, error } = await supabase.from('usuario').select('*').order('nome');
    if (error) setError(error.message);
    else setUsuarios(data || []);
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      const response = await axios.post(
        `${API_URL}/usuario/admin`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Usuário cadastrado com sucesso!');
      setForm({ nome: '', email: '', perfil: 'operacional', departamento: '', ramal: '', cpf: '' });
      fetchUsuarios();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cadastrar usuário.');
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
      <h1 style={{ color: theme.colors.blueDark1 }}>Usuários</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: 32, background: theme.colors.blueLight, padding: 24, borderRadius: 8, maxWidth: 500 }}>
        <h2 style={{ marginBottom: 16 }}>Cadastrar novo usuário</h2>
        <input name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} required style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        <input name="email" placeholder="E-mail" value={form.email} onChange={handleChange} required type="email" style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        <input name="cpf" placeholder="CPF" value={form.cpf} onChange={handleChange} style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        <input name="departamento" placeholder="Departamento" value={form.departamento} onChange={handleChange} style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        <input name="ramal" placeholder="Ramal" value={form.ramal} onChange={handleChange} style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        <select name="perfil" value={form.perfil} onChange={handleChange} style={{ width: '100%', marginBottom: 16, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
          {perfis.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: 8 }}>{success}</div>}
        <button type="submit" style={{ background: theme.colors.blueDark1, color: '#fff', padding: 10, border: 'none', borderRadius: 4, fontWeight: 600, width: '100%' }}>Cadastrar</button>
      </form>
      <h2 style={{ marginBottom: 16 }}>Lista de usuários</h2>
      {loading ? <div>Carregando usuários...</div> : (
        <table style={{ width: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: theme.colors.blueLight1 }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Nome</th>
              <th style={{ padding: 8, textAlign: 'left' }}>E-mail</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Perfil</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Departamento</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Ramal</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td style={{ padding: 8 }}>{u.nome}</td>
                <td style={{ padding: 8 }}>{u.email}</td>
                <td style={{ padding: 8 }}>{u.perfil}</td>
                <td style={{ padding: 8 }}>{u.departamento}</td>
                <td style={{ padding: 8 }}>{u.ramal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Usuarios; 