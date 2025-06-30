import React, { useState } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { theme } from '../styles/theme';

const AlterarSenha: React.FC = () => {
  const [novaSenha,setNovaSenha]=useState('');
  const [confirmar,setConfirmar]=useState('');
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  const navigate=useNavigate();

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();
    setErro(''); setSucesso('');
    if(novaSenha!==confirmar){setErro('As senhas não coincidem');return;}
    try{
      await api.patch('/usuarios/alterar-senha',{nova_senha:novaSenha});
      setSucesso('Senha alterada com sucesso!');
      setTimeout(()=>navigate('/dashboard'),1500);
    }catch(err:any){
      setErro(err.response?.data?.error||'Erro ao alterar senha');
    }
  };

  return (
    <div style={{padding:32,maxWidth:400,margin:'0 auto'}}>
      <h1 style={{color:theme.colors.blueDark}}>Alterar Senha</h1>
      <form onSubmit={handleSubmit}>
        <label>Nova Senha</label>
        <input type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} style={{width:'100%',padding:8,marginBottom:12}} required />
        <label>Confirmar Senha</label>
        <input type="password" value={confirmar} onChange={e=>setConfirmar(e.target.value)} style={{width:'100%',padding:8,marginBottom:12}} required />
        {erro && <p style={{color:'red'}}>{erro}</p>}
        {sucesso && <p style={{color:'green'}}>{sucesso}</p>}
        <button type="submit" style={{background:theme.colors.blue,color:'#fff',border:'none',padding:'10px 16px',borderRadius:4}}>Salvar</button>
      </form>
    </div>
  );
};

export default AlterarSenha; 