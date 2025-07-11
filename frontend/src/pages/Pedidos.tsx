import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { theme } from '../styles/theme';
import { useNavigate } from 'react-router-dom';
import { FaTruck, FaBoxOpen, FaWarehouse, FaFilePdf, FaFileExcel, FaPrint, FaEye } from 'react-icons/fa';
import Select from 'react-select'; // Added import for react-select

interface Pedido {
    id: number;
    status: string;
    valor_total: string;
    data_aprovacao: string;
    nome_fornecedor: string;
}

// Componente para o Tooltip
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="tooltip-text" style={styles.tooltipText}>{text}</div>
            {children}
            <style>{`
                .tooltip-text {
                    visibility: hidden;
                    opacity: 0;
                    transition: opacity 0.3s, visibility 0.3s;
                }
                div:hover > .tooltip-text {
                    visibility: visible;
                    opacity: 1;
                }
            `}</style>
        </div>
    );
};

const Pedidos: React.FC = () => {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

    // === Filtro Status ===
    const statusOptions = [
        { value: 'TODOS', label: 'Todos' },
        { value: 'AGUARDANDO_ENVIO', label: 'Aguardando Envio' },
        { value: 'PEDIDO_REALIZADO', label: 'Pedido Realizado' },
        { value: 'RECEBIDO', label: 'Recebido' },
        { value: 'RECEBIDO_COM_DIVERGENCIA', label: 'Recebido com Divergência' },
        { value: 'FINALIZADO', label: 'Finalizado' }
    ];
    const [selectedStatus, setSelectedStatus] = useState<{ value: string; label: string }>(statusOptions[0]);
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 10;

    const filteredPedidos = selectedStatus.value === 'TODOS'
        ? pedidos
        : pedidos.filter(p => p.status === selectedStatus.value);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const displayedPedidos = filteredPedidos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPedidos.length / itemsPerPage);

    const fetchPedidos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/pedidos');
            setPedidos(response.data);
            setError(null);
        } catch (err) {
            console.error("Erro ao buscar pedidos:", err);
            setError('Falha ao carregar os pedidos. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPedidos();
    }, []);

    const handleUpdateStatus = async (pedidoId: number, newStatus: string) => {
        setUpdatingStatus(pedidoId);
        try {
            await api.patch(`/pedidos/${pedidoId}/status`, { status: newStatus });
            await fetchPedidos(); // Recarrega a lista para mostrar o novo status
        } catch (err) {
            console.error(`Erro ao atualizar status do pedido ${pedidoId}:`, err);
            // Idealmente, mostrar um toast de erro para o usuário
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const renderActionButtons = (pedido: Pedido) => {
        const isLoading = updatingStatus === pedido.id;
        let actionButton = null;

        switch (pedido.status) {
            case 'AGUARDANDO_ENVIO':
                actionButton = (
                    <Tooltip text="Marcar como Enviado">
                        <button onClick={() => handleUpdateStatus(pedido.id, 'PEDIDO_REALIZADO')} disabled={isLoading} style={{...styles.iconButton, ...styles.iconButtonOrange}}>
                            {isLoading ? '...' : <FaTruck />}
                        </button>
                    </Tooltip>
                );
                break;
            case 'PEDIDO_REALIZADO':
                 actionButton = (
                    <Tooltip text="Marcar como Recebido">
                        <button onClick={() => handleUpdateStatus(pedido.id, 'RECEBIDO')} disabled={isLoading} style={{...styles.iconButton, ...styles.iconButtonBlue}}>
                            {isLoading ? '...' : <FaBoxOpen />}
                        </button>
                    </Tooltip>
                );
                break;
            case 'RECEBIDO':
                actionButton = (
                     <Tooltip text="Dar Entrada no Estoque">
                        <button onClick={() => navigate(`/movimentacoes/entrada/${pedido.id}`)} style={{...styles.iconButton, ...styles.iconButtonGreen}}>
                            <FaWarehouse />
                        </button>
                    </Tooltip>
                );
                break;
            case 'RECEBIDO_COM_DIVERGENCIA':
                actionButton = <span style={styles.statusPendente}>Auditoria Pendente</span>;
                break;
            case 'FINALIZADO':
                 actionButton = <span style={styles.statusFinalizado}>Finalizado</span>;
                 break;
            default:
                actionButton = null;
        }

        return (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <Tooltip text="Ver Detalhes">
                    <button onClick={() => navigate(`/pedidos/${pedido.id}`)} style={{...styles.iconButton, ...styles.iconButtonGray}}>
                        <FaEye />
                    </button>
                </Tooltip>
                {actionButton}
            </div>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatCurrency = (value: string) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(parseFloat(value));
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'AGUARDANDO_ENVIO':
                return { ...styles.status, backgroundColor: theme.colors.orange, color: 'white' };
            case 'PEDIDO_REALIZADO':
                return { ...styles.status, backgroundColor: theme.colors.blue, color: 'white' };
            case 'RECEBIDO':
                return { ...styles.status, backgroundColor: theme.colors.green, color: 'white' };
            case 'RECEBIDO_COM_DIVERGENCIA':
                return { ...styles.status, backgroundColor: theme.colors.red, color: 'white' };
            case 'FINALIZADO':
                return { ...styles.status, backgroundColor: theme.colors.gray, color: 'white' };
            default:
                return styles.status;
        }
    };

    if (loading) {
        return <div style={styles.container}>Carregando pedidos...</div>;
    }

    if (error) {
        return <div style={{ ...styles.container, color: theme.colors.red }}>{error}</div>;
    }

    return (
        <div style={styles.container}>
            {/* === Barra de filtros === */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ minWidth: 220 }}>
                    <Select
                        options={statusOptions}
                        value={selectedStatus}
                        onChange={(opt) => { if(opt){ setSelectedStatus(opt); setCurrentPage(1);} }}
                        placeholder="Filtrar por status"
                    />
                </div>
            </div>
            <div style={styles.headerContainer}>
                <h1 style={styles.header}>Pedidos de Compra</h1>
            </div>
            
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>ID</th>
                        <th style={styles.th}>Fornecedor</th>
                        <th style={styles.th}>Data</th>
                        <th style={styles.th}>Valor Total</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {displayedPedidos.length > 0 ? (
                        displayedPedidos.map(pedido => (
                            <tr key={pedido.id} style={styles.tr}>
                                <td style={styles.td}>#{pedido.id}</td>
                                <td style={styles.td}>{pedido.nome_fornecedor}</td>
                                <td style={styles.td}>{formatDate(pedido.data_aprovacao)}</td>
                                <td style={styles.td}>{formatCurrency(pedido.valor_total)}</td>
                                <td style={styles.td}><span style={getStatusStyle(pedido.status)}>{pedido.status.replace(/_/g, ' ')}</span></td>
                                <td style={{...styles.td, textAlign: 'center' as const}}>
                                    {renderActionButtons(pedido)}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} style={{ ...styles.td, textAlign: 'center' }}>
                                Nenhum pedido de compra encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            {totalPages > 1 && (
                <div style={styles.pagination}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={styles.pageButton}>Anterior</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button key={page} onClick={() => setCurrentPage(page)} style={page === currentPage ? styles.pageButtonActive : styles.pageButton}>{page}</button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={styles.pageButton}>Próxima</button>
                </div>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: '32px',
        backgroundColor: '#f8f9fa',
    },
    headerContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    header: {
        color: theme.colors.blueDark,
        margin: 0,
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        padding: '12px',
        borderBottom: `2px solid ${theme.colors.blueLight1}`,
        textAlign: 'left',
        color: theme.colors.gray,
        textTransform: 'uppercase',
        fontSize: '0.8em',
    },
    tr: {
        borderBottom: `1px solid ${theme.colors.blueLight1}`,
    },
    td: {
        padding: '16px 12px',
        verticalAlign: 'middle',
    },
    status: {
        padding: '6px 14px',
        borderRadius: '16px',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    statusFinalizado: {
        fontSize: '0.9rem',
        color: theme.colors.gray,
        fontWeight: 'bold',
    },
    statusPendente: {
        fontSize: '0.9rem',
        color: theme.colors.red,
        fontWeight: 'bold',
    },
    iconButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        transition: 'background-color 0.2s',
    },
    iconButtonGray: { color: theme.colors.gray, '&:hover': { backgroundColor: theme.colors.blueLight1 } },
    iconButtonOrange: { color: theme.colors.orange, '&:hover': { backgroundColor: '#ffe8d9' } },
    iconButtonBlue: { color: theme.colors.blue, '&:hover': { backgroundColor: '#e0f7ff' } },
    iconButtonGreen: { color: theme.colors.green, '&:hover': { backgroundColor: '#e6f4ea' } },
    tooltipText: {
        position: 'absolute',
        bottom: '125%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#333',
        color: '#fff',
        padding: '6px 10px',
        borderRadius: '4px',
        fontSize: '0.85rem',
        whiteSpace: 'nowrap',
        zIndex: 10,
    },
    pagination: {
        marginTop: '16px',
        display: 'flex',
        gap: '4px',
    },
    pageButton: {
        padding: '6px 12px',
        border: `1px solid ${theme.colors.blueLight1}`,
        background: '#fff',
        cursor: 'pointer',
    },
    pageButtonActive: {
        padding: '6px 12px',
        border: `1px solid ${theme.colors.blueDark}`,
        background: theme.colors.blueLight1,
        cursor: 'pointer',
    },
};

export default Pedidos; 