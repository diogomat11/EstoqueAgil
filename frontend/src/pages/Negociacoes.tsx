import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { theme } from '../styles/theme';

// --- Interfaces ---
interface Negociacao {
    id: number;
    descricao: string;
    validade_inicio: string;
    validade_fim: string;
    status: string;
}

interface Item {
    id: number;
    descricao: string;
}

interface Fornecedor {
    id: number;
    nome_fantasia: string;
}

interface Cotacao {
    item_id: number;
    fornecedor_id: number;
    valor_unitario: number;
    // Campos para exibição no modal
    item_descricao?: string;
    fornecedor_nome?: string;
}

const Negociacoes: React.FC = () => {
    // --- State ---
    const [negociacoes, setNegociacoes] = useState<Negociacao[]>([]);
    const [itens, setItens] = useState<Item[]>([]);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Negociacao>>({});
    
    // State para o sub-form de itens dentro do modal
    const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
    const [currentItem, setCurrentItem] = useState('');
    const [currentFornecedor, setCurrentFornecedor] = useState('');
    const [currentPrice, setCurrentPrice] = useState('');


    // --- Effects ---
    useEffect(() => {
        fetchNegociacoes();
        fetchItens();
        fetchFornecedores();
    }, []);

    // --- Data Fetching ---
    const fetchNegociacoes = async () => {
        try {
            const response = await api.get('/negociacoes');
            setNegociacoes(response.data);
        } catch (error) {
            console.error("Erro ao buscar negociações:", error);
        }
    };
    const fetchItens = async () => {
        try { const res = await api.get('/item_estoque'); setItens(res.data); } 
        catch (err) { console.error("Erro ao buscar itens:", err); }
    };
    const fetchFornecedores = async () => {
        try { const res = await api.get('/fornecedores'); setFornecedores(res.data); }
        catch (err) { console.error("Erro ao buscar fornecedores:", err); }
    };

    // --- Modal and Form Handlers ---
    const handleOpenModal = (negociacao: Negociacao | null = null) => {
        const inicio = negociacao?.validade_inicio ? new Date(negociacao.validade_inicio).toISOString().split('T')[0] : '';
        const fim = negociacao?.validade_fim ? new Date(negociacao.validade_fim).toISOString().split('T')[0] : '';

        setFormData(negociacao ? { ...negociacao, validade_inicio: inicio, validade_fim: fim } : {
            descricao: '',
            validade_inicio: '',
            validade_fim: '',
            status: 'ATIVO'
        });
        setCotacoes([]);
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCotacoes([]);
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // --- Sub-form Handlers ---
    const handleAddCotacao = () => {
        if (!currentItem || !currentFornecedor || !currentPrice) {
            alert("Preencha todos os campos para adicionar o item.");
            return;
        }
        const itemInfo = itens.find(i => i.id === Number(currentItem));
        const fornecedorInfo = fornecedores.find(f => f.id === Number(currentFornecedor));

        setCotacoes([...cotacoes, {
            item_id: Number(currentItem),
            fornecedor_id: Number(currentFornecedor),
            valor_unitario: Number(currentPrice),
            item_descricao: itemInfo?.descricao,
            fornecedor_nome: fornecedorInfo?.nome_fantasia
        }]);
        // Reset fields
        setCurrentItem('');
        setCurrentFornecedor('');
        setCurrentPrice('');
    };
    const handleRemoveCotacao = (index: number) => {
        setCotacoes(cotacoes.filter((_, i) => i !== index));
    };

    // --- Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cotacoes.length === 0) {
            alert("Adicione pelo menos um item à negociação.");
            return;
        }
        const payload = {
            nome: formData.descricao,
            validade_inicio: formData.validade_inicio,
            validade_fim: formData.validade_fim,
            status: 'ATIVO',
            cotacoes: cotacoes.map(({ item_id, fornecedor_id, valor_unitario }) => ({
                item_id, fornecedor_id, valor_unitario
            }))
        };
        try {
            await api.post('/negociacoes', payload);
            fetchNegociacoes();
            handleCloseModal();
        } catch (error) {
            console.error("Erro ao salvar negociação:", error);
            alert("Falha ao salvar negociação.");
        }
    };
    
    // --- Render ---
    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Negociações</h1>
                <button style={styles.button} onClick={() => handleOpenModal()}>Nova Negociação</button>
            </div>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>ID</th>
                        <th style={styles.th}>Descrição</th>
                        <th style={styles.th}>Início Validade</th>
                        <th style={styles.th}>Fim Validade</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {negociacoes.map(neg => (
                        <tr key={neg.id}>
                            <td style={styles.td}>{neg.id}</td>
                            <td style={styles.td}>{neg.descricao}</td>
                            <td style={styles.td}>{new Date(neg.validade_inicio).toLocaleDateString()}</td>
                            <td style={styles.td}>{new Date(neg.validade_fim).toLocaleDateString()}</td>
                            <td style={styles.td}>{neg.status}</td>
                            <td style={styles.td}>
                                <button style={styles.actionButton} onClick={() => handleOpenModal(neg)}>Editar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {isModalOpen && (
                <div style={styles.modalBackdrop}>
                    <div style={styles.modalContent}>
                        <h2>{formData.id ? 'Editar' : 'Nova'} Negociação</h2>
                        <form onSubmit={handleSubmit}>
                            <div style={styles.formGroup}>
                                <label>Descrição</label>
                                <input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} style={styles.input} required />
                            </div>
                            <div style={styles.formGroup}>
                                <label>Início da Validade</label>
                                <input type="date" name="validade_inicio" value={formData.validade_inicio || ''} onChange={handleChange} style={styles.input} required />
                            </div>
                            <div style={styles.formGroup}>
                                <label>Fim da Validade</label>
                                <input type="date" name="validade_fim" value={formData.validade_fim || ''} onChange={handleChange} style={styles.input} required />
                            </div>
                            
                            <hr style={styles.hr} />
                            <h3>Itens Negociados</h3>
                            
                            {/* Sub-form para adicionar itens */}
                            <div style={styles.subForm}>
                                <select style={styles.input} value={currentItem} onChange={e => setCurrentItem(e.target.value)}>
                                    <option value="">Selecione um item</option>
                                    {itens.map(i => <option key={i.id} value={i.id}>{i.descricao}</option>)}
                                </select>
                                <select style={styles.input} value={currentFornecedor} onChange={e => setCurrentFornecedor(e.target.value)}>
                                    <option value="">Selecione um fornecedor</option>
                                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome_fantasia}</option>)}
                                </select>
                                <input type="number" placeholder="Preço (R$)" style={styles.input} value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} />
                                <button type="button" style={styles.button} onClick={handleAddCotacao}>Adicionar</button>
                            </div>

                            {/* Lista de itens adicionados */}
                            <div style={styles.cotacoesList}>
                                {cotacoes.map((cot, index) => (
                                    <div key={index} style={styles.cotacaoItem}>
                                        <span>{cot.item_descricao} ({cot.fornecedor_nome}): <strong>R$ {cot.valor_unitario.toFixed(2)}</strong></span>
                                        <button type="button" onClick={() => handleRemoveCotacao(index)} style={styles.deleteButtonSmall}>Remover</button>
                                    </div>
                                ))}
                            </div>

                            <div style={styles.modalActions}>
                                <button type="submit" style={styles.button}>Salvar Negociação</button>
                                <button type="button" style={{ ...styles.button, ...styles.cancelButton }} onClick={handleCloseModal}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

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
        background: theme.colors.blueLight,
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        padding: '6px 12px',
        cursor: 'pointer',
        marginRight: 8,
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
        maxWidth: 600,
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
    },
    hr: { margin: '20px 0', border: 'none', borderTop: '1px solid #eee' },
    subForm: { display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '10px', alignItems: 'center', marginBottom: '16px'},
    cotacoesList: { maxHeight: '200px', overflowY: 'auto' as 'auto', background: '#f9f9f9', padding: '8px', borderRadius: '4px' },
    cotacaoItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee' },
    deleteButtonSmall: { background: theme.colors.red, color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer'},
};

export default Negociacoes; 