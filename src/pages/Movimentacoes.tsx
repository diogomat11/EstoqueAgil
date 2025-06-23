import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { theme } from '../styles/theme';
import { FaSearch } from 'react-icons/fa';

interface Movimentacao {
    id: number;
    tipo_movimentacao: 'ENTRADA' | 'SAIDA';
    data_movimentacao: string;
    observacao: string;
    nome_usuario: string;
    total_itens: number;
    status: 'CONCLUIDA' | 'PENDENTE_AUDITORIA' | 'CANCELADA';
}

const Movimentacoes: React.FC = () => {
    const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMovimentacoes = async () => {
            try {
                setLoading(true);
                const response = await api.get('/movimentacoes');
                // O backend retorna um objeto com a chave 'movimentacoes'
                setMovimentacoes(response.data.movimentacoes); 
                setError(null);
            } catch (err) {
                console.error("Erro ao buscar movimentações:", err);
                setError('Falha ao carregar as movimentações.');
            } finally {
                setLoading(false);
            }
        };

        fetchMovimentacoes();
    }, []);

    const handleNavigate = (id: number) => {
        navigate(`/movimentacoes/${id}`);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const getStatusStyle = (status: string): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            color: 'white',
            textTransform: 'capitalize'
        };

        switch (status) {
            case 'CONCLUIDA':
                return { ...baseStyle, backgroundColor: theme.colors.green };
            case 'PENDENTE_AUDITORIA':
                return { ...baseStyle, backgroundColor: theme.colors.orange };
            case 'CANCELADA':
                return { ...baseStyle, backgroundColor: theme.colors.gray };
            default:
                return baseStyle;
        }
    };

    if (loading) {
        return <div style={{ padding: 32, color: theme.colors.gray500 }}>Carregando histórico...</div>;
    }

    if (error) {
        return <div style={{ padding: 32, color: theme.colors.red500 }}>{error}</div>;
    }

    return (
        <div style={{ padding: 32 }}>
            <h1 style={{ color: theme.colors.blueDark, marginBottom: 24 }}>Histórico de Movimentações</h1>
            <button style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 4,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.blue,
                marginBottom: 24
            }} onClick={() => navigate('/movimentacoes/movimentar')}>Movimentar Estoque</button>
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: theme.colors.blueDark, color: 'white' }}>
                    <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>ID</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Data</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tipo</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Itens</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Usuário</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Observação</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {movimentacoes.length > 0 ? (
                        movimentacoes.map(mov => (
                            <tr key={mov.id} style={{ borderBottom: `1px solid ${theme.colors.gray200}` }}>
                                <td style={{ padding: '12px 16px' }}>#{mov.id}</td>
                                <td style={{ padding: '12px 16px' }}>{formatDate(mov.data_movimentacao)}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        color: mov.tipo_movimentacao === 'ENTRADA' ? theme.colors.green : theme.colors.red500,
                                        fontWeight: 'bold'
                                    }}>
                                        {mov.tipo_movimentacao}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={getStatusStyle(mov.status)}>
                                        {mov.status.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>{mov.total_itens}</td>
                                <td style={{ padding: '12px 16px' }}>{mov.nome_usuario}</td>
                                <td style={{ padding: '12px 16px' }}>{mov.observacao}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <button 
                                        onClick={() => handleNavigate(mov.id)} 
                                        style={mov.status === 'PENDENTE_AUDITORIA' ? {
                                            padding: '8px 16px',
                                            border: 'none',
                                            borderRadius: 4,
                                            color: 'white',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: theme.colors.orange
                                        } : {
                                            padding: '8px 16px',
                                            border: 'none',
                                            borderRadius: 4,
                                            color: 'white',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: theme.colors.blue
                                        }}
                                    >
                                        <FaSearch style={{ marginRight: 8 }}/>
                                        {mov.status === 'PENDENTE_AUDITORIA' ? 'Auditar' : 'Ver Detalhes'}
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={8} style={{ padding: '16px', textAlign: 'center', color: theme.colors.gray500 }}>
                                Nenhuma movimentação encontrada.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Movimentacoes; 