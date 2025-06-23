import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { theme } from '../styles/theme';
import logo from '../assets/logo_EstoqueAgil.png';
import { supabase } from '../lib/supabaseClient';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Requisições', path: '/requisicoes' },
  { label: 'Itens', path: '/itens' },
  { label: 'Fornecedores', path: '/fornecedores' },
  { label: 'Orçamentos', path: '/orcamentos' },
  { label: 'Pedidos', path: '/pedidos' },
  { label: 'Categorias', path: '/categorias' },
  { label: 'Negociações', path: '/negociacoes' },
  { label: 'Movimentações', path: '/movimentacoes' },
  { label: 'Usuários', path: '/usuarios' },
];

const Menu: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('session');
    if (error) {
      console.error('Error logging out:', error);
    } else {
      navigate('/login');
    }
  };

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', width: 220, background: theme.colors.blueDark, minHeight: '100vh', color: '#fff', padding: 24 }}>
      <div>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <img 
            src={logo} 
            alt="EstoqueAgil Logo" 
            style={{ 
              width: '80%', 
              maxWidth: 180,
              height: 'auto',
              marginBottom: 16
            }} 
          />
        </div>
        <ul style={{ listStyle: 'none', padding: 0, flexGrow: 1 }}>
          {menuItems.map(item => (
            <li key={item.path} style={{ marginBottom: 12 }}>
              <NavLink
                to={item.path}
                style={({ isActive }) => ({
                  display: 'block',
                  color: isActive ? theme.colors.blueLight : '#fff',
                  background: isActive ? theme.colors.blueDark1 : 'transparent',
                  textDecoration: 'none',
                  borderRadius: 4,
                  padding: '10px 16px',
                  fontWeight: isActive ? 700 : 400,
                  transition: 'background 0.2s',
                })}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            background: theme.colors.blueDark1,
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '10px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'background 0.2s',
          }}
        >
          Sair
        </button>
      </div>
    </nav>
  );
};

export default Menu; 