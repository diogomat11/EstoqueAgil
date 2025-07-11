import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import api from '../lib/api';
import { theme } from '../styles/theme';
import Modal from '../components/Modal';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import KanbanCompras from '../components/KanbanCompras';

interface KPIs {
  valor_total: number;
  itens_baixo_estoque: number;
  cobertura_media_dias: number | null;
  giro_ano: number | null;
}

interface AlertItem {
  filial_id:number;
  filial_nome:string;
  item_id:number;
  codigo:string;
  descricao:string;
  estoque_minimo:number;
  quantidade:number;
}

interface Option { id:number; nome?:string; descricao?:string; endereco?:string; }
interface HistoricoRow { mes:string; total_entrada:number; total_saida:number; }

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [usuarioDb, setUsuarioDb] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [alertas, setAlertas] = useState<AlertItem[]>([]);
  const [filiais,setFiliais]=useState<Option[]>([]);
  const [itens,setItens]=useState<Option[]>([]);
  const [filtroFilial,setFiltroFilial]=useState<string>('');
  const [filtroItem,setFiltroItem]=useState<string>('');
  const [historico,setHistorico]=useState<HistoricoRow[]>([]);

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

  // Busca resumo de estoque para KPIs
  useEffect(() => {
    api.get('/estoque/kpis').then(({ data }) => setKpis(data)).catch(()=>{});
  }, []);

  useEffect(()=>{ api.get('/filiais').then(({data})=>setFiliais(data)); api.get('/item_estoque').then(({data})=>setItens(data));},[]);
  useEffect(()=>{ const params:any={meses:12}; if(filtroFilial) params.filial_id=filtroFilial; if(filtroItem) params.item_id=filtroItem; api.get('/compras/historico',{params}).then(({data})=>setHistorico(data.rows));},[filtroFilial,filtroItem]);

  const abrirModalAlertas = () => {
    api.get('/estoque/alertas').then(({data})=>{setAlertas(data);setModalOpen(true);});
  };

  if (loading) return <div>Carregando...</div>;
  if (erro) return <div style={{ color: 'red' }}>{erro}</div>;
  if (!user) return <div>Nenhum usuário autenticado.</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFC', padding: 32 }}>
      {/* Resumo de estoque */}
      <h2 style={{ marginTop: 40, color: theme.colors.blueDark }}>Resumo de Estoque</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, padding: 16, background: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <span style={{ color: '#555', fontSize: 14, marginBottom: 8, display: 'block' }}>Valor Total em Estoque</span>
          <strong style={{ fontSize: 24, fontWeight: 700 }}>
            {kpis ? kpis.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '...'}
          </strong>
        </div>
        <div style={{ flex: 1, minWidth: 200, padding: 16, background: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', position:'relative' }}>
          <span style={{ color: '#555', fontSize: 14, marginBottom: 8, display: 'block' }}>Itens abaixo do mínimo</span>
          <strong style={{ fontSize: 24, fontWeight: 700 }}>
            {kpis ? kpis.itens_baixo_estoque : '...'}
          </strong>
          {kpis && kpis.itens_baixo_estoque>0 && (
            <button onClick={abrirModalAlertas} style={{ position:'absolute', top:8, right:8, background:'transparent', border:'none', cursor:'pointer', fontSize:18 }} title="Visualizar itens">
              👁
            </button>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200, padding: 16, background: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <span style={{ color: '#555', fontSize: 14, marginBottom: 8, display: 'block' }}>Cobertura Média (dias)</span>
          <strong style={{ fontSize: 24, fontWeight: 700 }}>
            {kpis && kpis.cobertura_media_dias !== null ? kpis.cobertura_media_dias : '...'}
          </strong>
        </div>
      </div>

      {/* Modal alertas */}
      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title="Itens abaixo do estoque mínimo">
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign:'left', padding:8 }}>Filial</th>
              <th style={{ textAlign:'left', padding:8 }}>Código</th>
              <th style={{ textAlign:'left', padding:8 }}>Descrição</th>
              <th style={{ textAlign:'right', padding:8 }}>Qtde</th>
              <th style={{ textAlign:'right', padding:8 }}>Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {alertas.map(a => (
              <tr key={`${a.filial_id}-${a.item_id}`}> 
                <td style={{ padding:8 }}>{a.filial_nome}</td>
                <td style={{ padding:8 }}>{a.codigo}</td>
                <td style={{ padding:8 }}>{a.descricao}</td>
                <td style={{ padding:8, textAlign:'right', color: theme.colors.red }}>{a.quantidade}</td>
                <td style={{ padding:8, textAlign:'right' }}>{a.estoque_minimo}</td>
              </tr>
            ))}
            {alertas.length===0 && <tr><td colSpan={5} style={{ textAlign:'center', padding:8 }}>Sem alertas 🎉</td></tr>}
          </tbody>
        </table>
      </Modal>

      {/* Gráfico Consumo × Compras */}
      <h2 style={{ marginTop:40,color: theme.colors.blueDark }}>Consumo × Compras (últimos 12 meses)</h2>
      <div style={{ display:'flex', gap:16, marginBottom:16 }}>
        <div>
          <label>Filial: </label>
          <select value={filtroFilial} onChange={e=>setFiltroFilial(e.target.value)}>
            <option value="">Todas</option>
            {filiais.map(f=> <option key={f.id} value={f.id}>{f.endereco||f.nome||f.id}</option>)}
          </select>
        </div>
        <div>
          <label>Item: </label>
          <select value={filtroItem} onChange={e=>setFiltroItem(e.target.value)}>
            <option value="">Todos</option>
            {itens.map(i=> <option key={i.id} value={i.id}>{i.descricao||i.nome||i.id}</option>)}
          </select>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={historico} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total_entrada" name="Compras" stackId="a" fill={theme.colors.greenDark} />
          <Bar dataKey="total_saida" name="Consumo" stackId="a" fill={theme.colors.blueDark} />
        </BarChart>
      </ResponsiveContainer>

      {/* Kanban */}
      <KanbanCompras />
    </div>
  );
};

export default Dashboard; 