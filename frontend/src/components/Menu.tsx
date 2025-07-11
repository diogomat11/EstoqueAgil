import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { theme } from '../styles/theme';
import logo from '../assets/logo_EstoqueAgil.png';
import { supabase } from '../lib/supabaseClient';
import { MdDashboard, MdShoppingCart, MdHistory, MdWarehouse, MdAttachMoney, MdFolder, MdWork, MdMenuBook } from 'react-icons/md';

// At top after imports
// UI constants for menu sizing
const PARENT_FONT = 16;   // px – main section
const SUB_FONT    = 14;   // px – submenu
const PARENT_ICON = 22;   // px – main icons
const SUB_ICON    = 18;   // px – sub icons

const menuGroups = [
  { label: 'Dashboard', path: '/dashboard', icon: MdDashboard },
  {
    label: 'Fluxo de Compras',
    children: [
      { label: 'Requisições', path: '/requisicoes', icon: MdMenuBook },
      { label: 'Orçamentos', path: '/orcamentos', icon: MdMenuBook },
      { label: 'Pedidos', path: '/pedidos', icon: MdShoppingCart },
      { label: 'Movimentações', path: '/movimentacoes', icon: MdHistory },
      { label: 'Auditoria', path: '/auditoria', icon: MdHistory, tooltip: 'Pendências de auditoria' }
    ],
    icon: MdShoppingCart
  },
  { label: 'Histórico de Compras', path: '/compras-analise', icon: MdHistory },
  { label: 'Visão de Estoque', path: '/estoque-visao-geral', icon: MdWarehouse },
  { label: 'Financeiro', path: '/financeiro', icon: MdAttachMoney },
  { label: 'DSO', path: '/dso', icon: MdWork, tooltip: 'Diretório de Serviços Operacionais' },
  {
    label: 'Cadastros',
    children: [
      { label: 'Itens', path: '/itens', icon: MdFolder },
      { label: 'Categorias', path: '/categorias', icon: MdFolder },
      { label: 'Usuários', path: '/usuarios', icon: MdFolder },
      { label: 'Fornecedores', path: '/fornecedores', icon: MdFolder },
      { label: 'Negociações', path: '/negociacoes', icon: MdFolder }
    ],
    icon: MdFolder
  }
];

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = React.useState<string[]>(() => {
    const current = location.pathname;
    return menuGroups.filter(g => g.children?.some((c:any) => current.startsWith(c.path))).map(g=>g.label);
  });

  const toggleGroup = (label:string) => {
    setOpenGroups(prev => prev.includes(label) ? prev.filter(l=>l!==label) : [...prev,label]);
  };

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
        <ul style={{ listStyle:'none', padding:0 }}>
          {menuGroups.map(group => {
            const ParentIcon = group.icon as any;
            return (
              'children' in group ? (
                <li key={group.label}>
                  <div
                    onClick={()=>toggleGroup(group.label)}
                    style={{
                      cursor:'pointer',
                      padding:'12px 16px',
                      fontWeight:700,
                      fontSize:PARENT_FONT,
                      display:'flex',
                      alignItems:'center',
                      gap:10,
                      color:'#fff',
                      background: openGroups.includes(group.label) ? theme.colors.blueDark1 : 'transparent',
                      borderRadius:6
                    }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background=theme.colors.blueDark1;}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background=openGroups.includes(group.label)?theme.colors.blueDark1:'transparent';}}
                  >
                    <ParentIcon size={PARENT_ICON} />
                    {group.label} {openGroups.includes(group.label)?'▾':'▸'}
                  </div>
                  {openGroups.includes(group.label) && (
                    <ul style={{ listStyle:'none', paddingLeft:24 }}>
                      {group.children!.map(child => {
                        const ChildIcon = child.icon as any;
                        return (
                          <li key={child.path} style={{ marginBottom:8 }}>
                            <NavLink
                              to={child.path}
                              style={({isActive})=>({
                                   display:'flex',
                                   alignItems:'center',
                                   gap:8,
                                   color:isActive?theme.colors.blueLight:'#cbd5e1',
                                   textDecoration:'none',
                                   padding:'6px 12px',
                                   borderRadius:4,
                                   fontSize:SUB_FONT
                              })}
                            >
                              <ChildIcon size={SUB_ICON} />
                              <span style={{fontSize:SUB_FONT}}>{child.label}</span>
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={group.path} style={{ marginBottom:12 }}>
                  <NavLink
                    to={group.path!}
                    title={group.tooltip}
                    style={({isActive})=>({
                         display:'flex',
                         alignItems:'center',
                         gap:10,
                         color:'#fff',
                         background:isActive?theme.colors.blueDark1:'transparent',
                         textDecoration:'none',
                         padding:'12px 16px',
                         borderRadius:6,
                         fontWeight:isActive?700:500,
                         fontSize:PARENT_FONT
                     })}
                  >
                    <ParentIcon size={PARENT_ICON} />
                    {group.label}
                  </NavLink>
                </li>
              )
            );
          })}
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