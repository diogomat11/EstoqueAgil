import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { theme } from '../styles/theme';

interface Categoria {
  id: number;
  descricao: string;
}

const Categorias: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState<Partial<Categoria>>({ descricao: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const response = await api.get('/categorias');
      setCategorias(response.data);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const handleOpenModal = (categoria: Categoria | null = null) => {
    setSelectedCategoria(categoria);
    setFormData(categoria || { descricao: '' });
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategoria(null);
    setFormData({ descricao: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (selectedCategoria) {
        await api.put(`/categorias/${selectedCategoria.id}`, formData);
      } else {
        await api.post('/categorias', formData);
      }
      fetchCategorias();
      handleCloseModal();
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);
      setError(error.response?.data?.error || 'Erro ao salvar categoria');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await api.delete(`/categorias/${id}`);
        fetchCategorias();
      } catch (error: any) {
        console.error('Erro ao excluir categoria:', error);
        alert(error.response?.data?.error || 'Erro ao excluir categoria');
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Categorias de Itens</h1>
        <button style={styles.button} onClick={() => handleOpenModal()}>Adicionar Categoria</button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Descrição</th>
            <th style={styles.th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {categorias.map(cat => (
            <tr key={cat.id}>
              <td style={styles.td}>{cat.descricao}</td>
              <td style={styles.td}>
                <button
                    style={{...styles.actionButton, background: theme.colors.blue, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}
                    onClick={() => handleOpenModal(cat)}
                    title="Editar Categoria"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V12h2.293L12.793 5.5z"/>
                    </svg>
                </button>
                <button 
                    style={{ ...styles.actionButton, ...styles.deleteButton, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} 
                    onClick={() => handleDelete(cat.id)}
                    title="Excluir Categoria"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <h2>{selectedCategoria ? 'Editar Categoria' : 'Adicionar Categoria'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label>Descrição</label>
                <input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} style={styles.input} required />
              </div>
              {error && <p style={{ color: 'red' }}>{error}</p>}
              <div style={styles.modalActions}>
                <button type="submit" style={styles.button}>Salvar</button>
                <button type="button" style={{ ...styles.button, ...styles.cancelButton }} onClick={handleCloseModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
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
  table: { width: '100%', borderCollapse: 'collapse' as 'collapse' },
  th: {
    background: '#f2f2f2',
    borderBottom: '2px solid #ddd',
    padding: 12,
    textAlign: 'left' as 'left',
    color: '#333',
  },
  td: { borderBottom: '1px solid #ddd', padding: 12 },
  actionButton: {
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '8px',
    cursor: 'pointer',
    marginRight: 8,
  },
  deleteButton: {
    background: theme.colors.red,
  },
  modalBackdrop: {
    position: 'fixed' as 'fixed',
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
    maxWidth: 500,
  },
  formGroup: { marginBottom: 16 },
  input: {
    width: '100%',
    padding: 8,
    border: '1px solid #ccc',
    borderRadius: 4,
    boxSizing: 'border-box' as 'border-box',
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 24 },
  cancelButton: {
    background: '#ccc',
    color: '#333',
  }
};

export default Categorias; 