import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { theme } from '../styles/theme';

interface ItemOption { value: number; label: string; }
interface FilialOption { value: number; label: string; }

interface MovItem { item_id: number; quantidade: number; valor_unitario?: number; }

type Tab = 'ENTRADA' | 'SAIDA' | 'REMANEJO';

const MovimentarEstoque: React.FC = () => {
    const navigate = useNavigate();
    const [tab,setTab] = useState<Tab>('ENTRADA');
    const [filiais,setFiliais] = useState<FilialOption[]>([]);
    const [itens,setItens] = useState<ItemOption[]>([]);
    const [allItens,setAllItens] = useState<ItemOption[]>([]);

    const [filialId,setFilialId] = useState<number|null>(null); // para entrada/saida
    const [filialOrigem,setFilialOrigem] = useState<number|null>(null); // remanejo
    const [filialDestino,setFilialDestino] = useState<number|null>(null);

    const [selectedItem,setSelectedItem] = useState<ItemOption|null>(null);
    const [quantidade,setQuantidade] = useState<number>(1);
    const [valorUnitario,setValorUnitario] = useState<number>(0);
    const [listaItens,setListaItens] = useState<MovItem[]>([]);
    const [observacao,setObservacao] = useState<string>('');

    useEffect(()=>{
        const loadData = async ()=>{
            try{
                const [fRes,iRes] = await Promise.all([
                    api.get('/filiais'),
                    api.get('/item_estoque')
                ]);
                setFiliais(fRes.data.map((f:any)=>({value:f.id,label:f.endereco||f.nome})));
                const itensAll = iRes.data.map((it:any)=>({value:it.id,label:`${it.codigo||'S/C'} - ${it.descricao}`}));
                setAllItens(itensAll);
                setItens(itensAll);
            }catch(err){ console.error(err); }
        };
        loadData();
    },[]);

    useEffect(()=>{
        const carregarEstoqueDisponivel = async (filial:number)=>{
            try{
                const resp = await api.get(`/movimentacoes/estoque-disponivel/${filial}`);
                const opts: ItemOption[] = resp.data.map((row:any)=>({
                    value: row.item_id,
                    label: `${row.codigo||'S/C'} - ${row.descricao} (Qtd: ${row.quantidade})`
                }));
                setItens(opts);
            }catch(err){
                console.error(err);
                setItens([]);
            }
        };

        if(tab==='SAIDA' && filialId){
            carregarEstoqueDisponivel(filialId);
        }else if(tab==='REMANEJO' && filialOrigem){
            carregarEstoqueDisponivel(filialOrigem);
        }else{
            setItens(allItens);
        }
    },[tab,filialId,filialOrigem,allItens]);

    useEffect(()=>{
        if(selectedItem && !itens.find(i=>i.value===selectedItem.value)){
            setSelectedItem(null);
        }
    },[itens]);

    // reset destino se igual origem
    useEffect(()=>{
        if(filialDestino===filialOrigem){
            setFilialDestino(null);
        }
    },[filialOrigem]);

    const addItem = ()=>{
        if(!selectedItem||quantidade<=0) return;
        const exists = listaItens.some(li=>li.item_id===selectedItem.value);
        if(exists) return;
        setListaItens([...listaItens,{item_id:selectedItem.value,quantidade, valor_unitario:tab==='ENTRADA'?valorUnitario:undefined}]);
        setSelectedItem(null); setQuantidade(1); setValorUnitario(0);
    };

    const removerItem = (id:number)=> setListaItens(listaItens.filter(li=>li.item_id!==id));

    const handleSubmit = async ()=>{
        if(listaItens.length===0){alert('Adicione itens');return;}
        try{
            if(tab==='ENTRADA'){
                if(!filialId){alert('Selecione filial');return;}
                await api.post('/movimentacoes/entrada-manual',{filial_id:filialId,observacao,itens:listaItens});
            }else if(tab==='SAIDA'){
                if(!filialId){alert('Selecione filial');return;}
                await api.post('/movimentacoes/saida',{filial_id:filialId,observacao,itens:listaItens});
            }else{
                if(!filialOrigem||!filialDestino||filialOrigem===filialDestino){alert('Selecione filiais diferentes');return;}
                await api.post('/movimentacoes/remanejamento',{filial_origem_id:filialOrigem,filial_destino_id:filialDestino,observacao,itens:listaItens});
            }
            alert('Movimentação registrada com sucesso');
            navigate('/movimentacoes');
        }catch(err:any){
            alert(err.response?.data?.error||'Erro ao registrar movimentação');
        }
    };

    return (
        <div style={{padding:32}}>
            <h1 style={{color:theme.colors.blueDark}}>Movimentar Estoque</h1>
            <div style={{display:'flex',gap:8,margin:'16px 0'}}>
                {(['ENTRADA','SAIDA','REMANEJO'] as Tab[]).map(t=>
                    <button key={t} onClick={()=>setTab(t)} style={{padding:'8px 16px',border:'none',borderBottom:tab===t?`4px solid ${theme.colors.blue}`:'4px solid transparent',background:'none',fontWeight:tab===t?700:400,cursor:'pointer'}}>{t}</button>) }
            </div>

            {tab!=='REMANEJO' && (
                <div style={{marginBottom:16}}>
                    <label>Filial</label>
                    <Select options={filiais} value={filiais.find(f=>f.value===filialId)||null} onChange={o=>setFilialId(o?o.value:null)} />
                </div>
            )}
            {tab==='REMANEJO' && (
                <div style={{display:'flex',gap:16,marginBottom:16}}>
                    <div style={{flex:1}}>
                        <label>Filial Origem</label>
                        <Select options={filiais} value={filiais.find(f=>f.value===filialOrigem)||null} onChange={o=>setFilialOrigem(o?o.value:null)} />
                    </div>
                    <div style={{flex:1}}>
                        <label>Filial Destino</label>
                        <Select options={filiais.filter(f=>f.value!==filialOrigem)} value={filiais.find(f=>f.value===filialDestino)||null} onChange={o=>setFilialDestino(o?o.value:null)} />
                    </div>
                </div>
            )}

            <div style={{display:'flex',gap:16,marginBottom:16}}>
                <div style={{flex:3}}>
                    <label>Item</label>
                    <Select options={itens} value={selectedItem} onChange={o=>setSelectedItem(o as any)} />
                </div>
                <div style={{flex:1}}>
                    <label>Quantidade</label>
                    <input type="number" value={quantidade} onChange={e=>setQuantidade(Number(e.target.value))} style={{width:'100%',padding:8}} />
                </div>
                {tab==='ENTRADA' && (
                    <div style={{flex:1}}>
                        <label>Valor Unitário (opcional)</label>
                        <input type="number" value={valorUnitario} onChange={e=>setValorUnitario(Number(e.target.value))} style={{width:'100%',padding:8}} />
                    </div>
                )}
                <button onClick={addItem} style={{background:theme.colors.green,color:'#fff',border:'none',borderRadius:4,padding:'8px 16px',alignSelf:'flex-end'}}>Adicionar</button>
            </div>

            <table style={{width:'100%',borderCollapse:'collapse',marginBottom:16}}>
                <thead style={{background:'#f0f0f0'}}>
                    <tr>
                        <th style={{padding:8,textAlign:'left'}}>Item</th>
                        <th style={{padding:8}}>Qtd</th>
                        {tab==='ENTRADA' && <th style={{padding:8}}>Vlr Unit.</th>}
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {listaItens.map(li=>{
                        const itLabel = itens.find(i=>i.value===li.item_id)?.label||li.item_id;
                        return (
                            <tr key={li.item_id} style={{borderBottom:'1px solid #ddd'}}>
                                <td style={{padding:8}}>{itLabel}</td>
                                <td style={{padding:8,textAlign:'center'}}>{li.quantidade}</td>
                                {tab==='ENTRADA' && <td style={{padding:8,textAlign:'center'}}>{li.valor_unitario||'-'}</td>}
                                <td style={{padding:8}}><button onClick={()=>removerItem(li.item_id)} style={{background:theme.colors.red,color:'#fff',border:'none',borderRadius:4,padding:'4px 8px'}}>X</button></td>
                            </tr>
                        );
                    })}
                    {listaItens.length===0 && <tr><td colSpan={4} style={{padding:8,textAlign:'center'}}>Nenhum item adicionado</td></tr>}
                </tbody>
            </table>

            <div style={{marginBottom:16}}>
                <label>Observação</label>
                <textarea value={observacao} onChange={e=>setObservacao(e.target.value)} style={{width:'100%',minHeight:80}} />
            </div>

            <button onClick={handleSubmit} style={{background:theme.colors.blue,color:'#fff',border:'none',borderRadius:4,padding:'12px 24px',fontSize:16,fontWeight:700}}>Registrar Movimentação</button>
        </div>
    );
};

export default MovimentarEstoque;
