import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { theme } from '../styles/theme';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface HistoricoRow { mes:string; total_entrada:number; total_saida:number; }
interface LeadTimeRow { item_id:number; fornecedor_id:number; leadtime_medio:number; leadtime_p95:number; }
interface UltimoPrecoRow { data:string; valor_unitario:number; }

interface Option { id:number; descricao?:string; nome_fantasia?:string; }

const tableStyle: React.CSSProperties = { width:'100%', borderCollapse:'collapse', marginBottom:32 };
const thStyle: React.CSSProperties = { background:theme.colors.blueDark1, color:'#fff', padding:8, textAlign:'left' };
const tdStyle: React.CSSProperties = { padding:8, borderBottom:'1px solid #eee' };

const ComprasAnalise:React.FC=()=>{
  const [historico,setHistorico]=useState<HistoricoRow[]>([]);
  const [leadTimes,setLeadTimes]=useState<LeadTimeRow[]>([]);
  const [ultimoPreco,setUltimoPreco]=useState<UltimoPrecoRow|null>(null);
  const [itens,setItens]=useState<Option[]>([]);
  const [fornecedores,setFornecedores]=useState<Option[]>([]);
  const [filtroItem,setFiltroItem]=useState('');
  const [filtroFornecedor,setFiltroFornecedor]=useState('');
  const [totais,setTotais]=useState({ compras:0, consumo:0 });

  useEffect(()=>{
    api.get('/item_estoque').then(({data})=>setItens(data)).catch(()=>{});
    api.get('/fornecedores').then(({data})=>setFornecedores(data)).catch(()=>{});
  },[]);

  useEffect(()=>{
    const params:any={meses:12};
    if(filtroItem) params.item_id=filtroItem;
    if(filtroFornecedor) params.fornecedor_id=filtroFornecedor;
    api.get('/compras/historico',{params}).then(({data})=>{
        const rows=data.rows||data;
        setHistorico(rows);
        const totalCompras = rows.reduce((s:any,r:any)=>s+Number(r.total_entrada||0),0);
        const totalConsumo = rows.reduce((s:any,r:any)=>s+Number(r.total_saida||0),0);
        setTotais({ compras:totalCompras, consumo:totalConsumo });
    }).catch(()=>{});
    api.get('/compras/leadtime',{params}).then(({data})=>{
       if(Array.isArray(data)) setLeadTimes(data as any);
       else setLeadTimes([data] as any);
    }).catch(()=>{});
  },[filtroItem,filtroFornecedor]);

  useEffect(()=>{
    if(!filtroItem) { setUltimoPreco(null); return; }
    const params:any={ item_id:filtroItem };
    if(filtroFornecedor) params.fornecedor_id=filtroFornecedor;
    api.get('/compras/ultimopreco',{params}).then(({data})=>setUltimoPreco(data)).catch(()=>setUltimoPreco(null));
  },[filtroItem,filtroFornecedor]);

  return(
    <div style={{padding:24}}>
      <h2>Análise de Compras</h2>

      <h3>Histórico Compras × Consumo (últimos 12 meses)</h3>
      <table style={tableStyle}>
        <thead><tr><th style={thStyle}>Mês</th><th style={thStyle}>Total Compras</th><th style={thStyle}>Total Consumo</th></tr></thead>
        <tbody>
          {historico.map(r=>(
            <tr key={r.mes}><td style={tdStyle}>{r.mes}</td><td style={tdStyle}>{Number(r.total_entrada).toFixed(2)}</td><td style={tdStyle}>{Number(r.total_saida).toFixed(2)}</td></tr>
          ))}
          {historico.length===0 && <tr><td style={tdStyle} colSpan={3}>Sem dados.</td></tr>}
        </tbody>
      </table>

      {/* Gráfico de barras */}
      {historico.length>0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={historico} margin={{top:20,right:30,left:0,bottom:5}}>
            <XAxis dataKey="mes"/>
            <YAxis/>
            <Tooltip/>
            <Legend/>
            <Bar dataKey="total_entrada" name="Compras" stackId="a" fill={theme.colors.greenDark}/>
            <Bar dataKey="total_saida" name="Consumo" stackId="a" fill={theme.colors.blueDark}/>
          </BarChart>
        </ResponsiveContainer>
      )}

      <h3>Lead-time Médio / P95</h3>
      <table style={tableStyle}>
        <thead><tr><th style={thStyle}>Item</th><th style={thStyle}>Fornecedor</th><th style={thStyle}>Médio (dias)</th><th style={thStyle}>P95 (dias)</th></tr></thead>
        <tbody>
          {Array.isArray(leadTimes) && leadTimes.map((r:any)=>(
            <tr key={`${r.item_id||'-'}-${r.fornecedor_id||'-'}`}><td style={tdStyle}>{r.item_id||'-'}</td><td style={tdStyle}>{r.fornecedor_id||'-'}</td><td style={tdStyle}>{r.leadtime_medio ? Number(r.leadtime_medio).toFixed(1) : (r.leadtime_medio_dias ? Number(r.leadtime_medio_dias).toFixed(1) : '-')}</td><td style={tdStyle}>{r.p95 ? Number(r.p95).toFixed(1) : (r.leadtime_p95 ? Number(r.leadtime_p95).toFixed(1) : '-')}</td></tr>
          ))}
          {(!leadTimes || (Array.isArray(leadTimes) && leadTimes.length===0)) && <tr><td colSpan={4} style={tdStyle}>Sem dados.</td></tr>}
        </tbody>
      </table>

      {/* Filtros */}
      <div style={{display:'flex',gap:16,marginBottom:16}}>
        <div>
          <label>Item: </label>
          <select value={filtroItem} onChange={e=>setFiltroItem(e.target.value)}>
            <option value="">Todos</option>
            {itens.map(i=> <option key={i.id} value={i.id}>{i.descricao||i.id}</option>)}
          </select>
        </div>
        <div>
          <label>Fornecedor: </label>
          <select value={filtroFornecedor} onChange={e=>setFiltroFornecedor(e.target.value)}>
            <option value="">Todos</option>
            {fornecedores.map(f=> <option key={f.id} value={f.id}>{f.nome_fantasia||f.id}</option>)}
          </select>
        </div>
      </div>

      {/* Cards resumo */}
      <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:200,padding:16,background:'#fff',borderRadius:8,boxShadow:'0 1px 3px rgba(0,0,0,0.1)',marginBottom:16}}>
          <span style={{color:'#555',fontSize:14}}>Total Comprado (12m)</span>
          <strong style={{fontSize:24}}>{totais.compras.toFixed(2)}</strong>
        </div>
        <div style={{flex:1,minWidth:200,padding:16,background:'#fff',borderRadius:8,boxShadow:'0 1px 3px rgba(0,0,0,0.1)',marginBottom:16}}>
          <span style={{color:'#555',fontSize:14}}>Consumo (12m)</span>
          <strong style={{fontSize:24}}>{totais.consumo.toFixed(2)}</strong>
        </div>
        <div style={{flex:1,minWidth:200,padding:16,background:'#fff',borderRadius:8,boxShadow:'0 1px 3px rgba(0,0,0,0.1)',marginBottom:16}}>
          <span style={{color:'#555',fontSize:14}}>Último Preço {filtroItem ? '' : '(selecione item)'}</span>
          <strong style={{fontSize:24}}>{ultimoPreco ? Number(ultimoPreco.valor_unitario).toFixed(2) : '-'}</strong>
        </div>
        <div style={{flex:1,minWidth:200,padding:16,background:'#fff',borderRadius:8,boxShadow:'0 1px 3px rgba(0,0,0,0.1)',marginBottom:16}}>
          <span style={{color:'#555',fontSize:14}}>Lead-time Médio (dias)</span>
          <strong style={{fontSize:24}}>{leadTimes && Array.isArray(leadTimes) && leadTimes[0] && leadTimes[0].leadtime_medio ? Number(leadTimes[0].leadtime_medio).toFixed(1): '-'}</strong>
        </div>
      </div>
    </div>
  );
};

export default ComprasAnalise; 