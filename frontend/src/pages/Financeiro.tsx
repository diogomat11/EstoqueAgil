import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { theme } from '../styles/theme';
import { FaEye } from 'react-icons/fa';

// Tooltip simples reutilizado
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div style={{ position: 'relative', display: 'inline-block' }}>
    <div className="tooltip-text" style={tooltipStyles.tooltipText}>{text}</div>
    {children}
    <style>{`
      .tooltip-text { visibility: hidden; opacity: 0; transition: opacity 0.3s, visibility 0.3s; }
      div:hover > .tooltip-text { visibility: visible; opacity: 1; }
    `}</style>
  </div>
);

const tooltipStyles: { [k:string]: React.CSSProperties } = { tooltipText:{ position:'absolute',background:'#000',color:'#fff',padding:'4px 8px',borderRadius:4,top:'-28px',fontSize:'0.75rem',whiteSpace:'nowrap'} };

interface ContaPagar {
  id: number;
  requisicao_id: number | null;
  pedido_id: number | null;
  fornecedor_id: number | null;
  fornecedor_nome?: string;
  valor: string;
  data_vencimento: string;
  status: 'ABERTO' | 'PAGO';
}

const Financeiro: React.FC = () => {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | 'ABERTO' | 'PAGO'>('TODOS');
  const [loading, setLoading] = useState<boolean>(true);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(contas.length / itemsPerPage);
  const displayedContas = contas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchContas = async () => {
    setLoading(true);
    try {
      const params = statusFiltro !== 'TODOS' ? { status: statusFiltro } : undefined;
      const response = await api.get('/financeiro', { params });
      setContas(response.data);
    } catch (err) {
      console.error('Erro ao buscar contas a pagar', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContas(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFiltro]);

  const handleQuitar = async (id: number) => {
    if (!window.confirm('Confirma quitar esta conta?')) return;
    try {
      await api.patch(`/financeiro/${id}/quitar`);
      fetchContas();
    } catch (err) {
      console.error('Erro ao quitar conta', err);
      alert('Falha ao quitar conta');
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR');
  const formatCurrency = (v: string) => new Intl.NumberFormat('pt-BR',{ style:'currency', currency:'BRL'}).format(parseFloat(v));

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Financeiro - Contas a Pagar</h1>

      <div style={styles.filtroContainer}>
        <label>Status: </label>
        <select value={statusFiltro} onChange={e=>{setCurrentPage(1); setStatusFiltro(e.target.value as any);}} style={styles.select}>
          <option value="TODOS">Todos</option>
          <option value="ABERTO">Aberto</option>
          <option value="PAGO">Pago</option>
        </select>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Pedido</th>
              <th style={styles.th}>Requisição</th>
              <th style={styles.th}>Fornecedor</th>
              <th style={styles.th}>Valor</th>
              <th style={styles.th}>Vencimento</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {displayedContas.length === 0 ? (
              <tr><td colSpan={8} style={styles.tdCenter}>Nenhuma conta encontrada.</td></tr>
            ) : (
              displayedContas.map(c=>(
                <tr key={c.id}>
                  <td style={styles.td}>#{c.id}</td>
                  <td style={styles.td}>{c.pedido_id ?? '-'}</td>
                  <td style={styles.td}>{c.requisicao_id ?? '-'}</td>
                  <td style={styles.td}>{c.fornecedor_nome ?? '-'}</td>
                  <td style={styles.td}>{formatCurrency(c.valor)}</td>
                  <td style={styles.td}>{formatDate(c.data_vencimento)}</td>
                  <td style={styles.td}><span style={{...styles.badge, backgroundColor: c.status==='ABERTO'? theme.colors.orange: theme.colors.green}}>{c.status}</span></td>
                  <td style={styles.tdCenter}>
                    {/* Botão visualizar pedido */}
                    {c.pedido_id && (
                      <Tooltip text="Ver Pedido">
                        <button onClick={()=>window.open(`/pedidos/${c.pedido_id}`,'_self')} style={{...styles.iconBtn, background:theme.colors.blueLight1}}>
                          <FaEye />
                        </button>
                      </Tooltip>
                    )}
                    {/* Botão quitar */}
                    {c.status==='ABERTO' && (
                      <button onClick={()=>handleQuitar(c.id)} style={{...styles.button, marginLeft:8}}>Quitar</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {totalPages>1 && (
        <div style={styles.pagination}>
          <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} style={styles.pageBtn}>Anterior</button>
          {Array.from({length: totalPages},(_,i)=>i+1).map(pn=>(
            <button key={pn} onClick={()=>setCurrentPage(pn)} style={pn===currentPage?styles.pageBtnActive:styles.pageBtn}>{pn}</button>
          ))}
          <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} style={styles.pageBtn}>Próxima</button>
        </div>
      )}
    </div>
  );
};

const styles: { [k:string]: React.CSSProperties } = {
  container:{ padding:32, background:'#f8f9fa' },
  title:{ color: theme.colors.blueDark },
  filtroContainer:{ marginBottom:16, display:'flex', alignItems:'center', gap:8 },
  select:{ padding:8 },
  table:{ width:'100%', borderCollapse:'collapse' },
  th:{ padding:12, borderBottom:`2px solid ${theme.colors.blueLight1}`, textAlign:'left', color:theme.colors.gray, textTransform:'uppercase', fontSize:'0.8em' },
  td:{ padding:'12px 8px' },
  tdCenter:{ padding:'12px 8px', textAlign:'center' as const },
  badge:{ padding:'4px 10px', color:'#fff', borderRadius:12, fontSize:'0.8em' },
  button:{ background:theme.colors.green, color:'#fff', border:'none', padding:'6px 12px', borderRadius:4, cursor:'pointer' },
  iconBtn:{ padding:'6px 10px', border:'none', borderRadius:4, cursor:'pointer', color:'#fff', marginRight:4 },
  pagination:{ marginTop:16, display:'flex', gap:4 },
  pageBtn:{ padding:'4px 10px', border:'1px solid #ccc', background:'#fff', cursor:'pointer' },
  pageBtnActive:{ padding:'4px 10px', border:'1px solid', background:theme.colors.blueLight1 },
};

export default Financeiro; 