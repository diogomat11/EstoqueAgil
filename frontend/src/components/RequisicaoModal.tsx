import React from 'react';
import { theme } from '../styles/theme';

interface Item {
  item_id:number;
  descricao:string;
  codigo:string;
  quantidade:number;
}
interface Historico {
  id:number;
  acao?:string;
  usuario_nome?:string;
  observacao?:string;
  data:string;
}
interface Props{
  data:any; // estrutura retornada de /requisicoes/:id
  onClose:()=>void;
}

const RequisicaoModal:React.FC<Props>=({data,onClose})=>{
  if(!data) return null;
  const itens:Item[] = data.itens||[];
  const historico:Historico[] = data.demanda_historico||[];
  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <button style={styles.closeBtn} onClick={onClose}>×</button>
        <h2 style={{marginTop:0}}>Requisição #{data.id}</h2>
        <p><strong>Solicitante:</strong> {data.solicitante_nome}</p>
        <p><strong>Status:</strong> {data.status}</p>
        <h3>Itens</h3>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th>Cód</th><th>Descrição</th><th>Qtd</th></tr></thead>
          <tbody>
            {itens.map(i=> (
              <tr key={i.item_id}><td>{i.codigo}</td><td>{i.descricao}</td><td>{i.quantidade}</td></tr>
            ))}
          </tbody>
        </table>
        <h3>Histórico da Demanda</h3>
        <ul style={{maxHeight:180,overflowY:'auto',paddingLeft:16}}>
          {historico.map(h=> (
            <li key={h.id} style={{marginBottom:4}}>
              <span>{new Date(h.data).toLocaleString()} - </span>
              {h.usuario_nome && <span>{h.usuario_nome}: </span>}
              <span>{h.acao}</span>
              {h.observacao && <span> - {h.observacao}</span>}
            </li>
          ))}
          {historico.length===0 && <li>Nenhum registro</li>}
        </ul>
        <div style={{marginTop:16,textAlign:'right'}}>
          <button style={styles.action} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

const styles:{[k:string]:React.CSSProperties}={
  backdrop:{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999},
  modal:{background:'#fff',padding:24,borderRadius:8,width:'90%',maxWidth:700,maxHeight:'90%',overflowY:'auto',position:'relative'},
  closeBtn:{position:'absolute',top:8,right:12,fontSize:24,border:'none',background:'transparent',cursor:'pointer'},
  action:{background:theme.colors.blue,color:'#fff',border:'none',borderRadius:4,padding:'8px 16px',cursor:'pointer'}
};

export default RequisicaoModal; 