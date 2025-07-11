import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Requisicoes from './pages/Requisicoes';
import Itens from './pages/Itens';
import Fornecedores from './pages/Fornecedores';
import Orcamentos from './pages/Orcamentos';
import Pedidos from './pages/Pedidos';
import Usuarios from './pages/Usuarios';
import Menu from './components/Menu';
import { supabase } from './lib/supabaseClient';
import Categorias from './pages/Categorias';
import Negociacoes from './pages/Negociacoes';
import PedidoDetalhes from './pages/PedidoDetalhes';
import EntradaEstoque from './pages/EntradaEstoque';
import Movimentacoes from './pages/Movimentacoes';
import MovimentacaoDetalhes from './pages/MovimentacaoDetalhes';
import DSO from './pages/DSO';
import MovimentarEstoque from './pages/MovimentarEstoque';
import AlterarSenha from './pages/AlterarSenha';
import api from './lib/api';
import EstoqueVisaoGeral from './pages/EstoqueVisaoGeral';
import ComprasAnalise from './pages/ComprasAnalise';
import Financeiro from './pages/Financeiro';

const useAuth = () => {
  const [user, setUser] = React.useState<any | undefined>(undefined);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  return user;
};

const getLocalProfile = async (user:any)=>{
  try{ const { data } = await api.get(`/usuarios/email/${user.email}`); return data; }catch{return null;}
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuth();
  const [mustChange,setMustChange]=React.useState(false);
  React.useEffect(()=>{ if(user){ getLocalProfile(user).then(p=>{ if(p?.mudar_senha){setMustChange(true);} });}},[user]);
  if(mustChange && window.location.pathname!=='/alterar-senha') return <Navigate to="/alterar-senha" replace/>;
  if (user === undefined) return <div>Verificando autenticação...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <div style={{ display: 'flex' }}>
              <Menu />
              <div style={{ flex: 1 }}>
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="requisicoes" element={<Requisicoes />} />
                  <Route path="itens" element={<Itens />} />
                  <Route path="fornecedores" element={<Fornecedores />} />
                  <Route path="orcamentos/:id?" element={<Orcamentos />} />
                  <Route path="pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
                  <Route path="pedidos/:id" element={<ProtectedRoute><PedidoDetalhes /></ProtectedRoute>} />
                  <Route path="usuarios" element={<Usuarios />} />
                  <Route path="categorias" element={<Categorias />} />
                  <Route path="negociacoes" element={<Negociacoes />} />
                  <Route path="compras-analise" element={<ComprasAnalise />} />
                  <Route path="financeiro" element={<Financeiro />} />
                  <Route path="movimentacoes/entrada/:pedidoId" element={<ProtectedRoute><EntradaEstoque /></ProtectedRoute>} />
                  <Route path="movimentacoes/:id" element={<ProtectedRoute><MovimentacaoDetalhes /></ProtectedRoute>} />
                  <Route path="movimentacoes" element={<ProtectedRoute><Movimentacoes /></ProtectedRoute>} />
                  <Route path="movimentacoes/movimentar" element={<ProtectedRoute><MovimentarEstoque /></ProtectedRoute>} />
                  <Route path="auditoria" element={<ProtectedRoute><Movimentacoes /></ProtectedRoute>} />
                  <Route path="dso" element={<DSO />} />
                  <Route path="alterar-senha" element={<AlterarSenha />} />
                  <Route path="estoque-visao-geral" element={<EstoqueVisaoGeral />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};

export default App;
