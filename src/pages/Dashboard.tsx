import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [usuarioDb, setUsuarioDb] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data, error }) => {
      setUser(data?.user);
      if (data?.user?.email) {
        // Buscar dados do usuário na tabela usuario pelo email
        const { data: usuario, error: dbError } = await supabase
          .from('usuario')
          .select('*')
          .eq('email', data.user.email)
          .single();
        setUsuarioDb(usuario);
        if (dbError) {
          setErro('Erro ao buscar usuario: ' + dbError.message);
          console.error(dbError);
        }
      } else {
        setErro('Usuário autenticado não possui email.');
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (erro) return <div style={{ color: 'red' }}>{erro}</div>;
  if (!user) return <div>Nenhum usuário autenticado.</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFC', padding: 32 }}>
      <h1 style={{ color: '#2B6CB0' }}>Bem-vindo ao EstoqueAgil</h1>
      <p style={{ color: '#1A202C' }}>Seu sistema de gestão de estoque minimalista e eficiente.</p>
      <div style={{ marginTop: 24 }}>
        <strong>Email autenticado:</strong> {user.email}
      </div>
      {usuarioDb && (
        <div style={{ marginTop: 16 }}>
          <strong>Nome:</strong> {usuarioDb.nome}<br />
          <strong>Perfil:</strong> {usuarioDb.perfil}<br />
          <strong>Departamento:</strong> {usuarioDb.departamento}
        </div>
      )}
      {!usuarioDb && <div style={{ color: 'orange', marginTop: 16 }}>Usuário não encontrado na tabela usuario.</div>}
    </div>
  );
};

export default Dashboard; 