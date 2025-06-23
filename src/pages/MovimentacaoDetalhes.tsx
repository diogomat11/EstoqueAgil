import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { theme } from '../styles/theme';
import { FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

// Interfaces para os dados
interface MovimentacaoItem {
    movimentacao_item_id: number;
    item_nome: string;
    unidade_medida: string;
    quantidade_pedida: number;
    valor_unitario_pedido: string;
    quantidade_recebida: number;
    valor_unitario_recebido: string;
    tipo_divergencia: string | null;
    item_status: 'CONCLUIDO' | 'PENDENTE_AUDITORIA';
}

interface MovimentacaoDetalhesData {
    id: number;
    pedido_id: number;
    nome_fornecedor: string;
    nome_usuario: string;
    data_movimentacao: string;
    status: string;
    observacao: string;
    nf_numero: string | null;
    nf_chave_acesso: string | null;
    nf_data_emissao: string | null;
    itens: MovimentacaoItem[];
}

const MovimentacaoDetalhes: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [movimentacao, setMovimentacao] = useState<MovimentacaoDetalhesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para auditoria por item
    const [justificativas, setJustificativas] = useState<{ [key: number]: string }>({});
    const [auditingItemId, setAuditingItemId] = useState<number | null>(null);

    const fetchDetalhes = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get(`/movimentacoes/${id}`);
            setMovimentacao(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Falha ao carregar detalhes da movimentação.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDetalhes();
    }, [fetchDetalhes]);

    const handleAuditoriaItem = async (movimentacaoItemId: number, aprovado: boolean) => {
        const justificativa = justificativas[movimentacaoItemId] || '';
        if (!aprovado && !justificativa) {
            alert('A justificativa é obrigatória para rejeitar o item.');
            return;
        }

        setAuditingItemId(movimentacaoItemId);
        setError(null);

        try {
            await api.post(`/auditoria/divergencia/${movimentacaoItemId}/resolver`, {
                aprovado,
                justificativa,
            });
            alert(`Item ${aprovado ? 'aprovado' : 'rejeitado'} com sucesso!`);
            fetchDetalhes(); // Recarrega os dados para refletir a mudança
        } catch (err: any) {
            setError(err.response?.data?.details || 'Falha ao processar auditoria do item.');
        } finally {
            setAuditingItemId(null);
        }
    };

    const handleJustificativaChange = (itemId: number, value: string) => {
        setJustificativas(prev => ({ ...prev, [itemId]: value }));
    };
    
    const formatCurrency = (value: string | number) => {
        const num = parseFloat(String(value));
        if (isNaN(num)) return 'R$ -';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    if (loading) return <div style={styles.container}>Carregando...</div>;
    if (error) return <div style={{...styles.container, color: 'red'}}>{error}</div>;
    if (!movimentacao) return <div style={styles.container}>Dados não encontrados.</div>;

    const renderDivergenceIcon = (item: MovimentacaoItem) => {
        const qtdDiverge = item.quantidade_recebida !== item.quantidade_pedida;
        const vlrDiverge = parseFloat(item.valor_unitario_recebido) !== parseFloat(item.valor_unitario_pedido);
        if (!qtdDiverge && !vlrDiverge) return null;

        let message = '';
        if (qtdDiverge && vlrDiverge) message = 'Quantidade e Valor divergem do pedido.';
        else if (qtdDiverge) message = 'Quantidade diverge do pedido.';
        else message = 'Valor diverge do pedido.';

        return (
            <div title={message} style={{ display: 'inline-block' }}>
                <FaExclamationTriangle color={theme.colors.orange} />
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Detalhes da Movimentação #{movimentacao.id}</h1>
            
            <div style={styles.grid}>
                <InfoCard label="Pedido de Compra" value={`#${movimentacao.pedido_id}`} />
                <InfoCard label="Fornecedor" value={movimentacao.nome_fornecedor} />
                <InfoCard label="Data da Movimentação" value={formatDate(movimentacao.data_movimentacao)} />
                <InfoCard label="Status" value={movimentacao.status.replace(/_/g, ' ')} />
                <InfoCard label="Número da NF" value={movimentacao.nf_numero || '-'} />
                <InfoCard label="Chave de Acesso NF" value={movimentacao.nf_chave_acesso || '-'} />
                <InfoCard label="Emissão da NF" value={formatDate(movimentacao.nf_data_emissao)} />
                <InfoCard label="Usuário da Conferência" value={movimentacao.nome_usuario} />
            </div>

            <h2 style={styles.subHeader}>Itens da Movimentação</h2>
            <table style={styles.table}>
                <thead>
                    <tr style={styles.trHeader}>
                        <th style={styles.th}></th>
                        <th style={styles.th}>Item</th>
                        <th style={styles.th}>Qtd. Pedida</th>
                        <th style={styles.th}>Vlr. Pedido</th>
                        <th style={styles.th}>Qtd. Recebida</th>
                        <th style={styles.th}>Vlr. Recebido</th>
                        <th style={{...styles.th, width: '30%', textAlign: 'center'}}>Ações de Auditoria</th>
                    </tr>
                </thead>
                <tbody>
                    {movimentacao.itens.map(item => (
                        <tr key={item.movimentacao_item_id} style={item.item_status === 'PENDENTE_AUDITORIA' ? styles.trPendente : styles.tr}>
                            <td style={{...styles.td, width: '3%'}}>{renderDivergenceIcon(item)}</td>
                            <td style={styles.td}>{item.item_nome}</td>
                            <td style={styles.td}>{Number(item.quantidade_pedida).toFixed(2)}</td>
                            <td style={styles.td}>{formatCurrency(item.valor_unitario_pedido)}</td>
                            <td style={{...styles.td, fontWeight: 'bold'}}>{Number(item.quantidade_recebida).toFixed(2)}</td>
                            <td style={{...styles.td, fontWeight: 'bold'}}>{formatCurrency(item.valor_unitario_recebido)}</td>
                            <td style={{...styles.td, textAlign: 'center'}}>
                                {item.item_status === 'PENDENTE_AUDITORIA' ? (
                                    <div style={styles.auditItemContainer}>
                                        <textarea
                                            placeholder="Justificativa (p/ rejeitar)"
                                            value={justificativas[item.movimentacao_item_id] || ''}
                                            onChange={(e) => handleJustificativaChange(item.movimentacao_item_id, e.target.value)}
                                            style={styles.textarea}
                                            rows={2}
                                            disabled={auditingItemId === item.movimentacao_item_id}
                                        />
                                        <div style={styles.auditActions}>
                                            <button 
                                                onClick={() => handleAuditoriaItem(item.movimentacao_item_id, false)}
                                                disabled={auditingItemId === item.movimentacao_item_id}
                                                style={{...styles.button, ...styles.buttonRed}}
                                            >
                                                {auditingItemId === item.movimentacao_item_id ? '...' : 'Rejeitar'}
                                            </button>
                                            <button 
                                                onClick={() => handleAuditoriaItem(item.movimentacao_item_id, true)}
                                                disabled={auditingItemId === item.movimentacao_item_id}
                                                style={{...styles.button, ...styles.buttonGreen}}
                                            >
                                                {auditingItemId === item.movimentacao_item_id ? '...' : 'Aprovar'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={styles.concluidoContainer}>
                                        <FaCheckCircle color={theme.colors.green} />
                                        <span style={{marginLeft: 8}}>Concluído</span>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const InfoCard: React.FC<{label: string, value: string}> = ({label, value}) => (
    <div style={styles.infoCard}>
        <span style={styles.infoCardLabel}>{label}</span>
        <span style={styles.infoCardValue}>{value}</span>
    </div>
);

const styles: { [key: string]: React.CSSProperties } = {
    container: { padding: 32, backgroundColor: '#f7fafc', minHeight: '100vh' },
    header: { color: theme.colors.blueDark, marginBottom: 24 },
    subHeader: { color: theme.colors.blueDark, marginTop: 32, marginBottom: 16, borderBottom: `2px solid ${theme.colors.blueLight1}`, paddingBottom: 8 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', marginBottom: 24 },
    infoCard: { backgroundColor: 'white', padding: '16px', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
    infoCardLabel: { color: theme.colors.gray, fontSize: '0.8rem', marginBottom: 4 },
    infoCardValue: { color: theme.colors.blueDark, fontSize: '1.1rem', fontWeight: 'bold' },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' },
    trHeader: { background: 'transparent' },
    th: { padding: '12px 16px', textAlign: 'left', color: theme.colors.gray, textTransform: 'uppercase', fontSize: '0.8rem' },
    tr: { background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'background-color 0.2s' },
    trPendente: { background: '#fffbeb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    td: { padding: '16px', border: 'none', verticalAlign: 'middle' },
    auditItemContainer: { display: 'flex', flexDirection: 'column' as const, gap: '8px', alignItems: 'center' },
    textarea: { width: '100%', padding: 8, border: `1px solid ${theme.colors.blueLight1}`, borderRadius: 4, fontSize: '0.9rem', boxSizing: 'border-box' },
    auditActions: { display: 'flex', justifyContent: 'center', gap: '8px' },
    button: { padding: '8px 16px', border: 'none', borderRadius: 4, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' },
    buttonGreen: { backgroundColor: theme.colors.green, '&:hover': { backgroundColor: theme.colors.greenDark } },
    buttonRed: { backgroundColor: theme.colors.red, '&:hover': { backgroundColor: theme.colors.redDark } },
    concluidoContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.colors.green, fontWeight: 'bold' }
};

export default MovimentacaoDetalhes; 