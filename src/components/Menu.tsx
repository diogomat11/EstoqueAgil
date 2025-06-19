import React from 'react';
import { NavLink } from 'react-router-dom';
import { theme } from '../styles/theme';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Requisições', path: '/requisicoes' },
  { label: 'Itens', path: '/itens' },
  { label: 'Fornecedores', path: '/fornecedores' },
  { label: 'Orçamentos', path: '/orcamentos' },
  { label: 'Pedidos', path: '/pedidos' },
  { label: 'Usuários', path: '/usuarios' },
];

const Menu: React.FC = () => {
  return (
    <nav style={{ width: 220, background: theme.colors.blueDark, minHeight: '100vh', color: '#fff', padding: 24 }}>
      <h2 style={{ marginBottom: 32, fontWeight: 700 }}>EstoqueAgil</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
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
    </nav>
  );
};

export default Menu; 