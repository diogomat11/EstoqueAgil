import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { theme } from '../styles/theme';

interface Item {
  id: number;
  codigo: string;
  descricao: string;
  tipo_unidade: string;
  estoque_minimo: number;
  estoque_atual: number;
  valor: number;
  fornecedor_id?: number;
  fornecedor_nome?: string;
  validade_valor?: string;
  categoria_id?: number;
  categoria_nome?: string;
  is_comodato: boolean;
  orcamento_id?: number;
}

interface Categoria { id: number; nome: string; }
interface Fornecedor { id: number; nome_fantasia: string; }
interface Negociacao { id: number; descricao: string; }

const Itens: React.FC = () => {
    const [itens, setItens] = useState<Item[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [negociacoes, setNegociacoes] = useState<Negociacao[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [formData, setFormData] = useState<Partial<Item>>({});

    useEffect(() => {
        const fetchItensPrincipais = async () => {
            try {
                const res = await api.get('/item_estoque');
                setItens(res.data);
            } catch (error) {
                console.error("Erro CRÍTICO ao buscar itens:", error);
            }
        };

        const fetchDadosSecundarios = async () => {
            try {
                const [catRes, fornRes, negRes] = await Promise.all([
                    api.get('/categorias'),
                    api.get('/fornecedores'),
                    api.get('/negociacoes?status=ATIVO')
                ]);
                setCategorias(catRes.data.map((c: any) => ({ id: c.id, nome: c.descricao })));
                setFornecedores(fornRes.data.map((f: any) => ({ id: f.id, nome_fantasia: f.nome })));
                setNegociacoes(negRes.data);
            } catch (error) {
                console.error("Erro ao carregar dados secundários (categorias, fornecedores):", error);
            }
        };

        fetchItensPrincipais();
        fetchDadosSecundarios();
    }, []);

    const handleOpenModal = (item: Item | null = null) => {
        setSelectedItem(item);
        if (item) {
            const validade = item.validade_valor ? new Date(item.validade_valor).toISOString().split('T')[0] : '';
            setFormData({ ...item, validade_valor: validade });
        } else {
            setFormData({
              descricao: '',
              tipo_unidade: '',
              estoque_minimo: 0,
              estoque_atual: 0,
              valor: 0,
              is_comodato: false,
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedItem(null);
      setFormData({});
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            let newState: Partial<Item> = { ...formData, [name]: checked };
            if (!checked) {
                newState = { ...newState, orcamento_id: undefined, fornecedor_id: undefined, valor: 0, validade_valor: '' };
            }
            setFormData(newState);
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };
    
    useEffect(() => {
        const fetchCotacaoDetails = async () => {
            if (formData.is_comodato && formData.orcamento_id && selectedItem?.id) {
                try {
                    const res = await api.get(`/orcamento/${formData.orcamento_id}/cotacao`);
                    const cotacaoDoItem = res.data.cotacoes_feitas.find((c: any) => c.item_id === selectedItem.id);
                    
                    if (cotacaoDoItem) {
                        setFormData((prev: any) => ({
                            ...prev,
                            fornecedor_id: cotacaoDoItem.fornecedor_id,
                            valor: cotacaoDoItem.valor_unitario
                        }));
                    } else {
                        setFormData((prev: any) => ({ ...prev, fornecedor_id: undefined, valor: 0 }));
                        alert("Atenção: Este item não possui preço definido na negociação selecionada.");
                    }
                } catch (err) { 
                    console.error("Erro ao buscar detalhes da negociação", err);
                    alert("Não foi possível carregar os detalhes da negociação.");
                }
            }
        };
        fetchCotacaoDetails();
    }, [formData.orcamento_id, formData.is_comodato, selectedItem?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (payload.valor) payload.valor = Number(payload.valor);
            if (payload.estoque_minimo) payload.estoque_minimo = Number(payload.estoque_minimo);
            if (payload.estoque_atual) payload.estoque_atual = Number(payload.estoque_atual);

            if (selectedItem) {
                await api.put(`/item_estoque/${selectedItem.id}`, payload);
            } else {
                await api.post('/item_estoque', payload);
            }
            fetchItensPrincipais();
            handleCloseModal();
        } catch (error) {
            alert('Erro ao salvar item.');
            console.error(error);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Tem certeza que deseja excluir este item?")) {
            try {
                await api.delete(`/item_estoque/${id}`);
                fetchItensPrincipais();
            }  catch (error) {
                alert('Erro ao excluir item.');
                console.error(error);
            }
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Itens</h1>
                <button style={styles.button} onClick={() => handleOpenModal()}>Adicionar Item</button>
            </div>
            
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Código</th>
                  <th style={styles.th}>Descrição</th>
                  <th style={styles.th}>Categoria</th>
                  <th style={styles.th}>Estoque</th>
                  <th style={styles.th}>Valor</th>
                  <th style={styles.th}>Fornecedor</th>
                  <th style={styles.th}>Comodato</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.map(item => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.codigo}</td>
                    <td style={styles.td}>{item.descricao}</td>
                    <td style={styles.td}>{item.categoria_nome}</td>
                    <td style={styles.td}>{item.estoque_atual}</td>
                    <td style={styles.td}>R$ {Number(item.valor).toFixed(2)}</td>
                    <td style={styles.td}>{item.fornecedor_nome}</td>
                    <td style={styles.td}>{item.is_comodato ? 'Sim' : 'Não'}</td>
                    <td style={styles.td}>
                      <button
                        style={{...styles.actionButton, background: theme.colors.blue, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}
                        onClick={() => handleOpenModal(item)}
                        title="Editar Item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V12h2.293L12.793 5.5z"/>
                        </svg>
                      </button>
                      <button
                        style={{ ...styles.actionButton, ...styles.deleteButton, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleDelete(item.id)}
                        title="Excluir Item"
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
                        <h2>{selectedItem ? 'Editar' : 'Adicionar'} Item</h2>
                        <form onSubmit={handleSubmit}>
                          <div style={styles.formGroup}>
                            <label>Descrição</label>
                            <input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} style={styles.input} required />
                          </div>

                          <div style={styles.formGroup}>
                            <label>Categoria</label>
                            <select name="categoria_id" value={formData.categoria_id || ''} onChange={handleChange} style={styles.input} required>
                              <option value="">Selecione...</option>
                              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                          </div>

                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
                            <div style={styles.formGroup}>
                              <label>Tipo Unidade</label>
                              <input type="text" name="tipo_unidade" value={formData.tipo_unidade || ''} onChange={handleChange} style={styles.input} />
                            </div>
                             <div style={styles.formGroup}>
                              <label>Estoque Mínimo</label>
                              <input type="number" name="estoque_minimo" value={formData.estoque_minimo || 0} onChange={handleChange} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                              <label>Estoque Atual</label>
                              <input type="number" name="estoque_atual" value={formData.estoque_atual || 0} onChange={handleChange} style={styles.input} />
                            </div>
                          </div>

                          <div style={styles.formGroup}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input type="checkbox" name="is_comodato" checked={!!formData.is_comodato} onChange={handleChange} />
                              É Comodato?
                            </label>
                          </div>

                          {formData.is_comodato && (
                            <div style={styles.formGroup}>
                              <label>Negociação Associada</label>
                              <select name="orcamento_id" value={formData.orcamento_id || ''} onChange={handleChange} style={styles.input} required={formData.is_comodato}>
                                <option value="">Selecione uma negociação</option>
                                {negociacoes.map(n => <option key={n.id} value={n.id}>{n.descricao}</option>)}
                              </select>
                            </div>
                          )}

                          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16}}>
                            <div style={styles.formGroup}>
                                <label>Fornecedor Padrão</label>
                                <select name="fornecedor_id" value={formData.fornecedor_id || ''} onChange={handleChange} style={styles.input} disabled={!!formData.is_comodato}>
                                    <option value="">Selecione...</option>
                                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome_fantasia}</option>)}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label>Valor Padrão (R$)</label>
                                <input type="number" step="0.01" name="valor" value={formData.valor || 0} onChange={handleChange} style={styles.input} disabled={!!formData.is_comodato} />
                            </div>
                             <div style={styles.formGroup}>
                                <label>Validade do Valor</label>
                                <input type="date" name="validade_valor" value={formData.validade_valor || ''} onChange={handleChange} style={styles.input} disabled={!!formData.is_comodato} />
                            </div>
                           </div>

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
      maxWidth: 700,
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

export default Itens; 