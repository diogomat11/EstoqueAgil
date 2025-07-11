import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { theme } from '../styles/theme';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface ResumoEstoque {
  valor_total: number;
  itens_baixo_estoque: number;
  total_itens: number;
}

interface AlertaEstoque {
  filial_id: number;
  filial_nome: string;
  item_id: number;
  codigo: string;
  descricao: string;
  estoque_minimo: number;
  quantidade: number;
}

interface HistoricoRow {
  mes: string;
  total_entrada: number;
  total_saida: number;
}

interface Option {
  id: number;
  nome: string;
}

interface VisaoRow {
  id: number;
  codigo: string;
  descricao: string;
  categoria: string;
  estoque_minimo: number;
  estoque: number;
  consumo_30d: number;
  cobertura_dias: number | null;
  estado: string;
}

const cardStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 200,
  padding: 16,
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const cardTitle: React.CSSProperties = { color: '#555', fontSize: 14, marginBottom: 8 };
const cardValue: React.CSSProperties = { fontSize: 24, fontWeight: 700 };

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', background: theme.colors.blueDark1, color: '#fff' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #eee' };

const EstoqueVisaoGeral: React.FC = () => {
  const [resumo, setResumo] = useState<ResumoEstoque | null>(null);
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [historico, setHistorico] = useState<HistoricoRow[]>([]);
  const [filiais, setFiliais] = useState<Option[]>([]);
  const [itens, setItens] = useState<Option[]>([]);
  const [filtroFilial, setFiltroFilial] = useState<string>('');
  const [filtroItem, setFiltroItem] = useState<string>('');
  const [categorias, setCategorias] = useState<Option[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroComodato, setFiltroComodato] = useState<string>('');
  const [visao, setVisao] = useState<VisaoRow[]>([]);

  useEffect(() => {
    api.get('/estoque/resumo').then(({ data }) => setResumo(data));
    api.get('/estoque/alertas').then(({ data }) => setAlertas(data));
    api.get('/filiais').then(({data})=> setFiliais(data));
    api.get('/item_estoque').then(({data})=> setItens(data));
  }, []);

  useEffect(()=>{
    const params: any = { meses: 12 };
    if (filtroFilial) params.filial_id = filtroFilial;
    if (filtroItem) params.item_id = filtroItem;
    api.get('/compras/historico',{ params }).then(({data})=> setHistorico(data.rows));
  },[filtroFilial, filtroItem]);

  useEffect(()=>{ api.get('/categorias').then(({data})=> setCategorias(data)); },[]);

  useEffect(()=>{
    if(!filtroFilial) return;
    const params:any = { filial_id: filtroFilial };
    if(filtroCategoria) params.categoria_id = filtroCategoria;
    if(filtroComodato) params.comodato = filtroComodato;
    api.get('/estoque/visao', { params }).then(({data})=> setVisao(data));
  },[filtroFilial, filtroCategoria, filtroComodato]);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 24 }}>Visão Geral de Estoque</h2>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <span style={cardTitle}>Valor Total em Estoque</span>
          <strong style={cardValue}>{resumo ? resumo.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '...'}</strong>
        </div>
        <div style={cardStyle}>
          <span style={cardTitle}>Itens abaixo do mínimo</span>
          <strong style={cardValue}>{resumo ? resumo.itens_baixo_estoque : '...'}</strong>
        </div>
        <div style={cardStyle}>
          <span style={cardTitle}>Total de Itens</span>
          <strong style={cardValue}>{resumo ? resumo.total_itens : '...'}</strong>
        </div>
      </div>

      {/* Alert Table */}
      <h3 style={{ marginTop: 40 }}>Alertas de Estoque</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Filial</th>
            <th style={thStyle}>Código</th>
            <th style={thStyle}>Descrição</th>
            <th style={thStyle}>Quantidade</th>
            <th style={thStyle}>Mínimo</th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((row) => (
            <tr key={`${row.filial_id}-${row.item_id}`}>
              <td style={tdStyle}>{row.filial_nome}</td>
              <td style={tdStyle}>{row.codigo}</td>
              <td style={tdStyle}>{row.descricao}</td>
              <td style={{ ...tdStyle, color: theme.colors.red, textAlign: 'right' }}>{row.quantidade}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{row.estoque_minimo}</td>
            </tr>
          ))}
          {alertas.length === 0 && (
            <tr>
              <td colSpan={5} style={{ ...tdStyle, textAlign: 'center' }}>Sem alertas no momento 🎉</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Gráfico Consumo x Compras */}
      <h3 style={{ marginTop: 40 }}>Consumo × Compras (últimos 12 meses)</h3>

      {/* Filtros */}
      <div style={{ display:'flex', gap:16, marginBottom:16 }}>
        <div>
          <label>Filial: </label>
          <select value={filtroFilial} onChange={(e)=>setFiltroFilial(e.target.value)}>
            <option value="">Todas</option>
            {filiais.map(f=> <option key={f.id} value={f.id}>{f.endereco || f.nome || f.id}</option>)}
          </select>
        </div>
        <div>
          <label>Item: </label>
          <select value={filtroItem} onChange={(e)=>setFiltroItem(e.target.value)}>
            <option value="">Todos</option>
            {itens.map(i=> <option key={i.id} value={i.id}>{i.descricao || i.nome || i.id}</option>)}
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

      {/* Gestão de Estoque Detalhada */}
      <h3 style={{ marginTop: 40 }}>Gestão de Estoque</h3>
      <div style={{ display:'flex', gap:16, marginBottom:16 }}>
        <div>
          <label>Filial: </label>
          <select value={filtroFilial} onChange={(e)=>setFiltroFilial(e.target.value)}>
            <option value="">Selecione</option>
            {filiais.map(f=> <option key={f.id} value={f.id}>{f.endereco || f.nome || f.id}</option>)}
          </select>
        </div>
        <div>
          <label>Categoria: </label>
          <select value={filtroCategoria} onChange={(e)=>setFiltroCategoria(e.target.value)}>
            <option value="">Todas</option>
            {categorias.map(c=> <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label>Comodato: </label>
          <select value={filtroComodato} onChange={(e)=>setFiltroComodato(e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </div>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Código</th>
            <th style={thStyle}>Descrição</th>
            <th style={thStyle}>Categoria</th>
            <th style={thStyle}>Estoque</th>
            <th style={thStyle}>Mínimo</th>
            <th style={thStyle}>Cons.30d</th>
            <th style={thStyle}>Deadline (dias)</th>
            <th style={thStyle}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {visao.map(v=> (
            <tr key={v.id}>
              <td style={tdStyle}>{v.codigo}</td>
              <td style={tdStyle}>{v.descricao}</td>
              <td style={tdStyle}>{v.categoria}</td>
              <td style={{...tdStyle,textAlign:'right'}}>{v.estoque}</td>
              <td style={{...tdStyle,textAlign:'right'}}>{v.estoque_minimo}</td>
              <td style={{...tdStyle,textAlign:'right'}}>{v.consumo_30d}</td>
              <td style={{...tdStyle,textAlign:'right'}}>{v.cobertura_dias ?? '-'}</td>
              <td style={{...tdStyle,color: v.estado==='CRITICO'?theme.colors.red: v.estado==='ABAIXO'?theme.colors.orange: v.estado==='INFLADO'? theme.colors.blueLight:'#333', fontWeight:700}}>{v.estado}</td>
            </tr>
          ))}
          {visao.length===0 && (
            <tr><td colSpan={8} style={{...tdStyle,textAlign:'center'}}>Selecione uma filial para visualizar.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EstoqueVisaoGeral; 