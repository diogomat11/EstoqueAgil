import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { theme } from '../styles/theme';
import { FaExclamationTriangle } from 'react-icons/fa';
import Select from 'react-select';

// Componente Tooltip que já usamos
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

// Interfaces
interface PedidoItem {
    item_estoque_id: number;
    quantidade: number;
    valor_unitario: string;
    descricao: string;
    codigo: string;
}

interface PedidoData {
    id: number;
    nome_fornecedor: string;
    itens: PedidoItem[];
    valor_total: string;
}

interface FilialOption { value:number; label:string; }

// Estados para os valores recebidos
type EntradaState = {
    [key: number]: number | string;
};

const EntradaEstoque: React.FC = () => {
    const { pedidoId } = useParams<{ pedidoId: string }>();
    const navigate = useNavigate();
    const [pedido, setPedido] = useState<PedidoData | null>(null);
    const [quantidadesRecebidas, setQuantidadesRecebidas] = useState<EntradaState>({});
    const [valoresRecebidos, setValoresRecebidos] = useState<EntradaState>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Novos estados para os dados da nota fiscal
    const [nfNumero, setNfNumero] = useState('');
    const [nfChaveAcesso, setNfChaveAcesso] = useState('');
    const [nfDataEmissao, setNfDataEmissao] = useState('');

    const [filiais,setFiliais] = useState<FilialOption[]>([]);
    const [filialId,setFilialId] = useState<number|null>(null);

    useEffect(() => {
        const fetchPedidoParaEntrada = async () => {
            if (!pedidoId) return;
            try {
                setLoading(true);
                const response = await api.get(`/pedidos/${pedidoId}`);
                setPedido(response.data);
                // Inicia os valores recebidos em branco
                const initialEmpty = response.data.itens.reduce((acc: any, item: PedidoItem) => {
                    acc[item.item_estoque_id] = '';
                    return acc;
                }, {});
                setQuantidadesRecebidas(initialEmpty);
                setValoresRecebidos(initialEmpty);

            } catch (err) {
                setError('Falha ao carregar dados do pedido.');
            } finally {
                setLoading(false);
            }
        };
        fetchPedidoParaEntrada();
    }, [pedidoId]);

    useEffect(()=>{
        api.get('/filiais').then(r=>setFiliais(r.data.map((f:any)=>({value:f.id,label:f.endereco||f.nome})))).catch(()=>{});
    },[]);

    const handleValueChange = (
        itemId: number, 
        value: string, 
        setter: React.Dispatch<React.SetStateAction<EntradaState>>
    ) => {
        setter(prev => ({ ...prev, [itemId]: value }));
    };

    // Lógica para checar divergências
    const divergencias = useMemo(() => {
        if (!pedido) return {};
        const div: { [key: number]: string } = {};
        pedido.itens.forEach(item => {
            const qtdRecebida = parseFloat(String(quantidadesRecebidas[item.item_estoque_id]));
            const vlrRecebido = parseFloat(String(valoresRecebidos[item.item_estoque_id]));
            
            // Não checa se os campos estiverem vazios
            if (isNaN(qtdRecebida) && isNaN(vlrRecebido)) return;

            let msg = [];
            // Compara os valores como números para ignorar formatação
            if (!isNaN(qtdRecebida) && qtdRecebida !== Number(item.quantidade)) {
                msg.push('Quantidade diverge do pedido.');
            }
            if (!isNaN(vlrRecebido) && vlrRecebido !== parseFloat(item.valor_unitario)) {
                msg.push('Valor unitário diverge do pedido.');
            }
            
            if (msg.length > 0) div[item.item_estoque_id] = msg.join(' ');
        });
        return div;
    }, [pedido, quantidadesRecebidas, valoresRecebidos]);

    const hasDivergencias = Object.keys(divergencias).length > 0;

    const handleSubmit = async () => {
        if (!pedido) return;
        setSubmitting(true);
        setError(null);
        
        if(!filialId){ setError('Selecione a filial de destino'); setSubmitting(false); return; }

        const itens_recebidos = pedido.itens.map(item => ({
            item_estoque_id: item.item_estoque_id,
            quantidade_pedida: Number(item.quantidade),
            valor_unitario_pedido: parseFloat(item.valor_unitario),
            quantidade_recebida: parseFloat(String(quantidadesRecebidas[item.item_estoque_id])) || 0,
            valor_unitario_recebido: parseFloat(String(valoresRecebidos[item.item_estoque_id])) || 0,
        }));

        // Validar se pelo menos um item foi preenchido
        const algumItemPreenchido = Object.values(quantidadesRecebidas).some(v => v !== '') || Object.values(valoresRecebidos).some(v => v !== '');
        if (!algumItemPreenchido) {
             setError("Preencha a quantidade ou o valor recebido para pelo menos um item.");
             setSubmitting(false);
             return;
        }

        try {
            const response = await api.post('/movimentacoes/entrada', {
                pedido_compra_id: pedido.id,
                itens_recebidos,
                observacao: `Conferência de entrada do pedido #${pedido.id}`,
                nf_numero: nfNumero || null,
                nf_chave_acesso: nfChaveAcesso || null,
                nf_data_emissao: nfDataEmissao || null,
                filial_id: filialId,
            });
            alert(response.data.message);
            navigate('/movimentacoes'); // Redireciona para a lista de movimentações
        } catch (err: any) {
            setError(err.response?.data?.details || 'Erro ao registrar a entrada de estoque.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (value: number | string) => {
        const num = parseFloat(String(value));
        if (isNaN(num)) return 'R$ -';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
    };

    if (loading) return <div style={styles.container}>Carregando...</div>;
    if (error) return <div style={{...styles.container, color: 'red' }}>{error}</div>;
    if (!pedido) return <div style={styles.container}>Pedido não encontrado.</div>;

    return (
        <div style={styles.container}>
            <div style={styles.headerContainer}>
                <div>
                    <h1 style={styles.header}>Entrada de Estoque - Pedido #{pedido.id}</h1>
                    <p style={styles.subHeader}>Fornecedor: <strong>{pedido.nome_fornecedor}</strong></p>
                </div>
                <div style={styles.totalContainer}>
                    <span style={styles.totalLabel}>Valor Total do Pedido</span>
                    <span style={styles.totalValue}>{formatCurrency(pedido.valor_total)}</span>
                </div>
            </div>
            
            <div style={{marginBottom:24}}>
                <label style={styles.label}>Filial de Destino</label>
                <Select options={filiais} value={filiais.find(f=>f.value===filialId)||null} onChange={o=>setFilialId(o?o.value:null)} />
            </div>

            <div style={styles.nfContainer}>
                <h2 style={styles.nfHeader}>Dados da Nota Fiscal (Opcional)</h2>
                <div style={styles.nfFields}>
                    <div style={styles.nfField}>
                        <label style={styles.label}>Número da NF</label>
                        <input type="text" value={nfNumero} onChange={e => setNfNumero(e.target.value)} style={styles.inputNf} />
                    </div>
                    <div style={styles.nfField}>
                        <label style={styles.label}>Chave de Acesso</label>
                        <input type="text" value={nfChaveAcesso} onChange={e => setNfChaveAcesso(e.target.value)} style={styles.inputNfLarge} />
                    </div>
                    <div style={styles.nfField}>
                        <label style={styles.label}>Data de Emissão</label>
                        <input type="date" value={nfDataEmissao} onChange={e => setNfDataEmissao(e.target.value)} style={styles.inputNf} />
                    </div>
                </div>
            </div>

            <table style={styles.table}>
                <thead>
                    <tr style={styles.trHeader}>
                        <th style={{...styles.th, width: '30%'}}>Item</th>
                        <th style={styles.th}>Qtd. Pedida</th>
                        <th style={styles.th}>Vlr. Unit. Pedido</th>
                        <th style={styles.th}>Subtotal Pedido</th>
                        <th style={styles.thInput}>Qtd. Recebida</th>
                        <th style={styles.thInput}>Vlr. Unit. Recebido</th>
                        <th style={styles.th}>Divergência</th>
                    </tr>
                </thead>
                <tbody>
                    {pedido.itens.map(item => (
                        <tr key={item.item_estoque_id} style={styles.tr}>
                            <td style={styles.td}>{item.descricao} ({item.codigo})</td>
                            <td style={styles.td}>{Number(item.quantidade).toFixed(2)}</td>
                            <td style={styles.td}>{formatCurrency(item.valor_unitario)}</td>
                            <td style={styles.td}>{formatCurrency(Number(item.quantidade) * parseFloat(item.valor_unitario))}</td>
                            <td style={styles.td}>
                                <input
                                    type="number"
                                    value={quantidadesRecebidas[item.item_estoque_id]}
                                    onChange={(e) => handleValueChange(item.item_estoque_id, e.target.value, setQuantidadesRecebidas)}
                                    style={styles.input}
                                />
                            </td>
                            <td style={styles.td}>
                                <input
                                    type="number"
                                    value={valoresRecebidos[item.item_estoque_id]}
                                    onChange={(e) => handleValueChange(item.item_estoque_id, e.target.value, setValoresRecebidos)}
                                    style={styles.input}
                                />
                            </td>
                            <td style={{...styles.td, textAlign: 'center'}}>
                                {divergencias[item.item_estoque_id] && (
                                    <Tooltip text={divergencias[item.item_estoque_id]}>
                                        <FaExclamationTriangle color={theme.colors.orange} />
                                    </Tooltip>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={styles.footer}>
                 <button onClick={handleSubmit} disabled={submitting} style={styles.button}>
                    {submitting ? 'Confirmando...' : 'Confirmar Entrada em Estoque'}
                </button>
            </div>
        </div>
    );
};

// Styles
const styles = {
    container: { padding: 32, backgroundColor: '#f7fafc', minHeight: '100vh' },
    headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    header: { color: theme.colors.blueDark, margin: 0 },
    subHeader: { color: theme.colors.gray, marginTop: 4, fontSize: '1rem' },
    totalContainer: {
        backgroundColor: theme.colors.blueLight1,
        padding: '12px 20px',
        borderRadius: 8,
        textAlign: 'right' as const,
    },
    totalLabel: {
        display: 'block',
        color: theme.colors.gray,
        fontSize: '0.8rem',
        marginBottom: 4,
    },
    totalValue: {
        display: 'block',
        color: theme.colors.blueDark,
        fontSize: '1.5rem',
        fontWeight: 'bold' as const,
    },
    nfContainer: { backgroundColor: 'white', padding: '16px 24px', marginBottom: 24, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    nfHeader: { fontSize: '1.1rem', color: theme.colors.blueDark, marginTop: 0, marginBottom: 16, borderBottom: `1px solid ${theme.colors.blueLight1}`, paddingBottom: 8 },
    nfFields: { display: 'flex', gap: '24px', alignItems: 'flex-end' },
    nfField: { display: 'flex', flexDirection: 'column' as const },
    label: { marginBottom: 4, fontSize: '0.8rem', color: theme.colors.gray, fontWeight: 'bold' as const },
    inputNf: { padding: '8px', border: `1px solid ${theme.colors.blueLight1}`, borderRadius: 4, width: '180px' },
    inputNfLarge: { padding: '8px', border: `1px solid ${theme.colors.blueLight1}`, borderRadius: 4, width: '360px' },
    table: { width: '100%', borderCollapse: 'separate' as const, borderSpacing: '0 4px' },
    trHeader: { background: 'transparent' },
    th: { padding: '12px 16px', textAlign: 'left' as const, color: theme.colors.gray, textTransform: 'uppercase' as const, fontSize: '0.8rem' },
    thInput: { padding: '12px 16px', textAlign: 'center' as const, color: theme.colors.gray, textTransform: 'uppercase' as const, fontSize: '0.8rem' },
    tr: { background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    td: { padding: '16px', border: 'none', verticalAlign: 'middle' },
    input: { width: '100px', padding: '8px', border: `1px solid ${theme.colors.blueLight1}`, borderRadius: 4, textAlign: 'right' as const },
    footer: { marginTop: 24, display: 'flex', justifyContent: 'flex-end' },
    button: { padding: '12px 24px', background: theme.colors.blueDark, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' as const },
    tooltipText: {
        position: 'absolute' as const, bottom: '125%', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: '#333', color: '#fff', padding: '6px 10px', borderRadius: '4px',
        fontSize: '0.85rem', whiteSpace: 'nowrap' as const, zIndex: 10,
    }
};

export default EntradaEstoque; 