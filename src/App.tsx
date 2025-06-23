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
import MovimentarEstoque from './pages/MovimentarEstoque';

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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuth();
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
                  <Route path="movimentacoes/entrada/:pedidoId" element={<ProtectedRoute><EntradaEstoque /></ProtectedRoute>} />
                  <Route path="movimentacoes/:id" element={<ProtectedRoute><MovimentacaoDetalhes /></ProtectedRoute>} />
                  <Route path="movimentacoes/movimentar" element={<ProtectedRoute><MovimentarEstoque /></ProtectedRoute>} />
                  <Route path="movimentacoes" element={<ProtectedRoute><Movimentacoes /></ProtectedRoute>} />
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
