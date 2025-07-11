import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { theme } from '../styles/theme';

interface Usuario {
  id: number;
  nome: string;
}

interface Demanda {
  id: number;
  nome: string;
  descricao: string;
  data_cadastro: string;
  created_at: string;
  updated_at: string;
  prazo_conclusao: string | null;
  tipo: string;
  etapa?: string;
  requisicao_id?: number;
  responsaveis: { id: number; nome: string }[] | null;
}

const DSO: React.FC = () => {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    prazo_conclusao: '',
    tipo: '',
    responsaveis: [] as number[],
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedDemanda, setSelectedDemanda] = useState<Demanda | null>(null);
  const [modalRequisicao, setModalRequisicao] = useState<any|null>(null);

  useEffect(() => {
    fetchDemandas();
    fetchUsuarios();
  }, []);

  const fetchDemandas = async () => {
    try {
      const { data } = await api.get('/demandas');
      setDemandas(data);
    } catch (err) {
      console.error('Erro ao buscar demandas', err);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const { data } = await api.get('/usuarios');
      setUsuarios(data);
    } catch (err) {
      console.error('Erro ao buscar usuários', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, selectedOptions } = e.target as HTMLSelectElement;
    if (name === 'responsaveis') {
      const values = Array.from(selectedOptions).map(opt => Number(opt.value));
      setForm(prev => ({ ...prev, responsaveis: values }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEdit = (d: Demanda) => {
    setSelectedDemanda(d);
    setForm({
      nome: d.nome || '',
      descricao: d.descricao || '',
      prazo_conclusao: d.prazo_conclusao ? d.prazo_conclusao.substring(0, 10) : '',
      tipo: d.tipo || '',
      responsaveis: d.responsaveis ? d.responsaveis.map(r => r.id) : [],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (selectedDemanda) {
        await api.put(`/demandas/${selectedDemanda.id}`, form);
      } else {
        await api.post('/demandas', form);
      }
      fetchDemandas();
      setIsModalOpen(false);
      setSelectedDemanda(null);
      setForm({ nome: '', descricao: '', prazo_conclusao: '', tipo: '', responsaveis: [] });
    } catch (err: any) {
      console.error('Erro ao salvar demanda', err);
      setError(err.response?.data?.error || 'Erro ao salvar demanda');
    }
  };

  const isExpiringSoon = (prazo: string | null) => {
    if (!prazo) return false;
    const diff = new Date(prazo).getTime() - Date.now();
    return diff > 0 && diff <= 1000 * 60 * 60 * 24; // 24h
  };

  const expiringCount = demandas.filter(d => isExpiringSoon(d.prazo_conclusao)).length;

  const handleViewReq = async (d: Demanda) => {
    if(!d.requisicao_id) return;
    try {
      const { data } = await api.get(`/requisicoes/${d.requisicao_id}`);
      setModalRequisicao(data);
    } catch(err){
      console.error('erro requisicao detalhes',err);
    }
  };

  const calcTempo = (d:Demanda) => {
    const inicio = new Date(d.created_at || d.data_cadastro);
    const fim = d.status==='ENCERRADO' ? new Date(d.updated_at) : new Date();
    const diff = fim.getTime()-inicio.getTime();
    const horas = Math.floor(diff/36e5);
    const dias = Math.floor(horas/24);
    if(dias>0) return `${dias}d ${horas%24}h`;
    return `${horas}h`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>DSO - Diretório de Serviços Operacionais</h1>
        <button style={styles.button} onClick={() => setIsModalOpen(true)}>Nova Demanda</button>
      </div>

      {expiringCount > 0 && (
        <div style={styles.notificationBanner}>
          ⚠️ Você tem {expiringCount} demanda{expiringCount > 1 ? 's' : ''} com prazo próximo de expirar.
        </div>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Nome</th>
            <th style={styles.th}>Descrição</th>
            <th style={styles.th}>Tipo</th>
            <th style={styles.th}>Prazo</th>
            <th style={styles.th}>Tempo na atividade</th>
            <th style={styles.th}>Responsáveis</th>
            <th style={styles.th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {demandas.map(d => (
            <tr key={d.id} style={isExpiringSoon(d.prazo_conclusao) ? styles.expiringRow : {}}>
              <td style={styles.td}>{d.nome}</td>
              <td style={styles.td}>{d.descricao}</td>
              <td style={styles.td}>{d.tipo}</td>
              <td style={styles.td}>{d.prazo_conclusao ? new Date(d.prazo_conclusao).toLocaleDateString() : '-'}</td>
              <td style={styles.td}>{calcTempo(d)}</td>
              <td style={styles.td}>{d.responsaveis && Array.isArray(d.responsaveis) ? d.responsaveis.filter(r => r && r.nome).map(r => r.nome).join(', ') : '-'}</td>
              <td style={styles.td}>
                <button style={{ ...styles.actionButton, background: theme.colors.blue }} title="Ver Requisição" onClick={()=>handleViewReq(d)}>👁️</button>
                <button
                  style={{ ...styles.actionButton, background: theme.colors.blue }}
                  onClick={() => handleEdit(d)}
                  title="Editar Demanda"
                >
                  ✏️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <h2>{selectedDemanda ? 'Editar Demanda' : 'Cadastrar Demanda'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label>Nome da tarefa</label>
                <input type="text" name="nome" value={form.nome} onChange={handleChange} style={styles.input} required />
              </div>
              <div style={styles.formGroup}>
                <label>Descrição</label>
                <textarea name="descricao" value={form.descricao} onChange={handleChange} style={{ ...styles.input, height: 80 }} />
              </div>
              <div style={styles.formGroup}>
                <label>Tipo de tarefa</label>
                <input type="text" name="tipo" value={form.tipo} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Prazo de conclusão</label>
                <input type="date" name="prazo_conclusao" value={form.prazo_conclusao} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Responsáveis</label>
                <select name="responsaveis" multiple value={form.responsaveis.map(String)} onChange={handleChange} style={{ ...styles.input, height: 120 }}>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              {error && <p style={{ color: 'red' }}>{error}</p>}
              <div style={styles.modalActions}>
                <button type="submit" style={styles.button}>Salvar</button>
                <button type="button" style={{ ...styles.button, ...styles.cancelButton }} onClick={() => { setIsModalOpen(false); setSelectedDemanda(null); setForm({ nome: '', descricao: '', prazo_conclusao: '', tipo: '', responsaveis: [] }); }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalRequisicao && (
        <RequisicaoModal data={modalRequisicao} onClose={()=>setModalRequisicao(null)} />
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: 32, fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { color: theme.colors.blueDark, margin: 0 },
  button: {
    background: theme.colors.blue,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 600,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: '#f2f2f2',
    borderBottom: '2px solid #ddd',
    padding: 12,
    textAlign: 'left',
    color: '#333',
  },
  td: { borderBottom: '1px solid #ddd', padding: 12 },
  expiringRow: { background: '#fffbe6' },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    background: '#fff',
    padding: 24,
    borderRadius: 8,
    width: '90%',
    maxWidth: 600,
  },
  formGroup: { marginBottom: 16, display: 'flex', flexDirection: 'column' },
  input: {
    width: '100%',
    padding: 8,
    border: '1px solid #ccc',
    borderRadius: 4,
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 12 },
  cancelButton: { background: theme.colors.red },
  notificationBanner: {
    background: '#fffbe6',
    padding: 12,
    borderRadius: 4,
    marginBottom: 24,
  },
  actionButton: {
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '6px 8px',
    cursor: 'pointer',
    marginRight: 4,
  },
};

export default DSO; 