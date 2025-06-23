import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { theme } from '../styles/theme';
import { FaFilePdf, FaFileExcel, FaPrint } from 'react-icons/fa';

interface PedidoDetalhesData {
    id: number;
    status: string;
    valor_total: string;
    data_aprovacao: string;
    nome_fornecedor: string;
    nome_aprovador: string;
    itens: Array<{
        item_estoque_id: number;
        quantidade: number;
        valor_unitario: string;
        descricao: string;
        codigo: string;
    }>;
}

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="tooltip-text" style={styles.tooltipText}>{text}</div>
            {children}
            <style>{`
                .tooltip-text { visibility: hidden; opacity: 0; transition: opacity 0.3s, visibility 0.3s; }
                div:hover > .tooltip-text { visibility: visible; opacity: 1; }
            `}</style>
        </div>
    );
};

const PedidoDetalhes: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [pedido, setPedido] = useState<PedidoDetalhesData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState<boolean>(false);

    useEffect(() => {
        if (!id) return;
        const fetchPedido = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/pedidos/${id}`);
                setPedido(response.data);
                setError(null);
            } catch (err) {
                console.error(`Erro ao buscar detalhes do pedido ${id}:`, err);
                setError('Falha ao carregar o pedido. Verifique o ID ou tente novamente.');
            } finally {
                setLoading(false);
            }
        };

        fetchPedido();
    }, [id]);

    const handleUpdateStatus = async (newStatus: string) => {
        if (!id) return;
        setUpdating(true);
        try {
            await api.patch(`/pedidos/${id}/status`, { status: newStatus });
            // Atualiza o status localmente para refletir a mudança imediatamente
            if (pedido) {
                setPedido({ ...pedido, status: newStatus });
            }
        } catch (err) {
            console.error(`Erro ao atualizar status do pedido ${id}:`, err);
            // TODO: Mostrar um toast/notificação de erro para o usuário
        } finally {
            setUpdating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const renderActionButtons = () => {
        if (!pedido) return null;

        switch (pedido.status) {
            case 'AGUARDANDO_ENVIO':
                return (
                    <button onClick={() => handleUpdateStatus('PEDIDO_REALIZADO')} disabled={updating}>
                        {updating ? 'Atualizando...' : 'Marcar como Enviado'}
                    </button>
                );
            case 'PEDIDO_REALIZADO':
                return (
                    <button onClick={() => handleUpdateStatus('RECEBIDO')} disabled={updating}>
                        {updating ? 'Atualizando...' : 'Marcar como Recebido'}
                    </button>
                );
            case 'RECEBIDO':
                return (
                    <button onClick={() => navigate(`/movimentacoes/entrada/${pedido.id}`)} disabled={updating}>
                        Dar Entrada no Estoque
                    </button>
                );
            default:
                return null;
        }
    };
    
    // Funções de formatação...
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');
    const formatCurrency = (value: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(value));

    if (loading) return <div>Carregando...</div>;
    if (error) return <div style={{color: 'red'}}>{error}</div>;
    if (!pedido) return <div>Pedido não encontrado.</div>;

    return (
        <div style={styles.container}>
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-area, #printable-area * {
                        visibility: visible;
                    }
                    #printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
            <div id="printable-area">
                <div style={styles.headerContainer}>
                    <h1 style={{ color: theme.colors.blueDark }}>Detalhes do Pedido #{pedido.id}</h1>
                    <div style={styles.exportContainer} className="no-print">
                        <Tooltip text="Gerar PDF (em breve)">
                            <button style={{...styles.iconButton, cursor: 'not-allowed'}} disabled><FaFilePdf/></button>
                        </Tooltip>
                        <Tooltip text="Exportar Excel (em breve)">
                            <button style={{...styles.iconButton, cursor: 'not-allowed'}} disabled><FaFileExcel/></button>
                        </Tooltip>
                        <Tooltip text="Imprimir Pedido">
                            <button onClick={handlePrint} style={styles.iconButton}><FaPrint/></button>
                        </Tooltip>
                    </div>
                </div>
                
                <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                    <p><strong>Fornecedor:</strong> {pedido.nome_fornecedor}</p>
                    <p><strong>Status:</strong> {pedido.status}</p>
                    <p><strong>Valor Total:</strong> {formatCurrency(pedido.valor_total)}</p>
                    <p><strong>Data de Aprovação:</strong> {formatDate(pedido.data_aprovacao)}</p>
                    <p><strong>Aprovado por:</strong> {pedido.nome_aprovador}</p>
                </div>

                <div style={{ marginBottom: 24 }} className="no-print">
                    {renderActionButtons()}
                </div>

                <h2 style={{ color: theme.colors.blueDark }}>Itens do Pedido</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: theme.colors.blueLight, color: 'white' }}>
                            <th>Código</th>
                            <th>Descrição</th>
                            <th>Quantidade</th>
                            <th>Valor Unitário</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pedido.itens.map(item => (
                            <tr key={item.item_estoque_id}>
                                <td>{item.codigo}</td>
                                <td>{item.descricao}</td>
                                <td>{item.quantidade}</td>
                                <td>{formatCurrency(item.valor_unitario)}</td>
                                <td>{formatCurrency(String(item.quantidade * parseFloat(item.valor_unitario)))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: 32,
    },
    headerContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    exportContainer: {
        display: 'flex',
        gap: '8px',
    },
    iconButton: {
        padding: '8px',
        background: theme.colors.gray,
        color: '#fff',
        border: 'none',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '1rem',
        transition: 'background 0.2s',
    },
    tooltipText: {
        position: 'absolute' as const,
        bottom: '125%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#333',
        color: '#fff',
        padding: '6px 10px',
        borderRadius: '4px',
        fontSize: '0.85rem',
        whiteSpace: 'nowrap' as const,
        zIndex: 10,
    }
};

export default PedidoDetalhes; 