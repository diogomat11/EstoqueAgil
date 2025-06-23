import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import LibCurrencyInput from 'react-currency-input-field';
import api from '../lib/api';
import { theme } from '../styles/theme';
import { useAuthProfile } from '../lib/useAuth';
import { FaEye, FaPencilAlt, FaTrash } from 'react-icons/fa';

// Componente wrapper para usar a biblioteca
const CurrencyInput = ({ value, onChange, disabled }: { value: string, onChange: (value: string) => void, disabled?: boolean }) => {
    return (
        <LibCurrencyInput
            id={`currency-input-${Math.random()}`}
            name={`currency-input-${Math.random()}`}
            placeholder="R$ 0,00"
            value={value}
            onValueChange={(val) => onChange(val || '')}
            style={{ ...styles.input, backgroundColor: disabled ? '#f0f0f0' : '#fff' }}
            prefix="R$ "
            decimalSeparator=","
            groupSeparator="."
            decimalsLimit={2}
            disabled={disabled}
        />
    );
};

interface Orcamento {
    id: number;
    requisicao_id: number;
    status: string;
    tipo: string;
    data: string;
}

interface ItemACotar {
    item_id: number;
    quantidade: number;
    descricao: string;
    codigo: string;
}

interface Fornecedor {
    id: number;
    nome: string;
    pedido_minimo?: number;
}

interface CotacaoFeita {
    item_id: number;
    fornecedor_id: number;
    valor_unitario: number;
}

// Nova estrutura para a tela de aprovação
interface ApprovalDecision {
    selectedFornecedorId: number | null;
    quantidade: number;
    justificativa: string;
    status: 'APROVADO' | 'REPROVADO';
    valorUnitario: number;
}

// Tooltip simples reutilizado do módulo de Pedidos
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
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

const OrcamentoCotacao: React.FC = () => {
    const { id: orcamentoIdFromParams } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const userProfile = useAuthProfile();

    const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
    const [itens, setItens] = useState<ItemACotar[]>([]);
    const [allFornecedores, setAllFornecedores] = useState<Fornecedor[]>([]);
    const [selectedFornecedores, setSelectedFornecedores] = useState<(number | null)[]>([null]);
    const [cotacoes, setCotacoes] = useState<Record<string, string>>({});
    const [status, setStatus] = useState('');
    const [fornecedoresCotacao, setFornecedoresCotacao] = useState<Fornecedor[]>([]);
    const [approvalDecisions, setApprovalDecisions] = useState<Record<number, ApprovalDecision>>({});
    const [isLoading, setIsLoading] = useState(true);
    
    // Variáveis de permissão com verificação case-insensitive correta
    const canApprove = useMemo(() => {
        const perfil = userProfile?.perfil?.toUpperCase();
        return perfil === 'SUPERVISOR' || perfil === 'ADMIN';
    }, [userProfile]);
    
    const canQuote = useMemo(() => {
        const perfil = userProfile?.perfil?.toUpperCase();
        return canApprove || perfil === 'ORCAMENTISTA';
    }, [canApprove, userProfile]);

    const fetchOrcamentos = async () => {
        try {
            const response = await api.get('/orcamentos');
            setOrcamentos(response.data);
        } catch (error) {
            console.error("Falha ao buscar orçamentos:", error);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const requisicaoId = params.get('requisicaoId');

        if (requisicaoId) {
            api.post('/orcamentos/gerar', { requisicao_id: requisicaoId })
                .then(response => navigate(`/orcamentos/${response.data.orcamento_id}`, { replace: true }))
                .catch(error => {
                    console.error("Erro ao gerar ou buscar orçamento:", error);
                    alert('Falha ao iniciar o processo de orçamento.');
                    navigate('/requisicoes');
                });
        } else if (orcamentoIdFromParams) {
            const loadData = async () => {
                setIsLoading(true);
                await fetchAllFornecedores();
                await fetchDadosCotacao(orcamentoIdFromParams);
                setIsLoading(false);
            };
            loadData();
        } else {
            setIsLoading(true);
            fetchOrcamentos().finally(() => setIsLoading(false));
        }
    }, [orcamentoIdFromParams, location.search, navigate]);

    const fetchDadosCotacao = async (orcamentoId: string) => {
        try {
            const response = await api.get(`/orcamentos/${orcamentoId}/cotacao`);
            
            if (!response.data || typeof response.data !== 'object') {
                throw new Error("A API retornou uma resposta inválida ou vazia.");
            }

            const { itens_a_cotar, cotacoes_feitas, status, fornecedores_cotacao } = response.data;
            
            // Definindo o tipo para os itens que agora vêm com dados do vencedor
            interface ItemComVencedor extends ItemACotar {
                vencedor_fornecedor_id: number | null;
                vencedor_valor_unitario: number | null;
            }

            setItens(itens_a_cotar || []);
            setStatus(status);
            setFornecedoresCotacao(fornecedores_cotacao || []);

            const initialCotacoes: Record<string, string> = {};
            const fornecedorIds = new Set<number>();

            (cotacoes_feitas || []).forEach((c: CotacaoFeita) => {
                initialCotacoes[`${c.item_id}-${c.fornecedor_id}`] = String(c.valor_unitario);
                fornecedorIds.add(c.fornecedor_id);
            });
            
            if (fornecedorIds.size > 0 && status === 'EM_ELABORACAO') {
                 setSelectedFornecedores(Array.from(fornecedorIds));
            } else if (status === 'EM_ELABORACAO') {
                setSelectedFornecedores([null]); 
            }

            setCotacoes(initialCotacoes);

            if (status === 'AGUARDANDO_APROVACAO') {
                const decisions: Record<number, ApprovalDecision> = {};
                
                // Lógica simplificada: usa os dados do vencedor vindos diretamente da API
                (itens_a_cotar || []).forEach((item: ItemComVencedor) => {
                    decisions[item.item_id] = {
                        selectedFornecedorId: item.vencedor_fornecedor_id || null,
                        quantidade: item.quantidade,
                        justificativa: '',
                        status: 'APROVADO',
                        valorUnitario: item.vencedor_valor_unitario || 0,
                    };
                });
                setApprovalDecisions(decisions);
            }

        } catch (error) { 
            console.error("Erro ao buscar dados do orçamento:", error); 
            alert("Não foi possível carregar os dados do orçamento. Verifique o console para mais detalhes.");
            navigate('/orcamentos');
        }
    };

    const fetchAllFornecedores = async () => {
        try {
            const response = await api.get('/fornecedores');
            setAllFornecedores(response.data);
        } catch (error) { console.error("Erro ao buscar fornecedores:", error); }
    };
    
    const handleAddColumn = () => setSelectedFornecedores(prev => [...prev, null]);

    const handleRemoveColumn = (indexToRemove: number) => {
        const fornecedorIdToRemove = selectedFornecedores[indexToRemove];
        const newCotacoes = { ...cotacoes };
        if (fornecedorIdToRemove) {
            itens.forEach(item => delete newCotacoes[`${item.item_id}-${fornecedorIdToRemove}`]);
        }
        setCotacoes(newCotacoes);
        setSelectedFornecedores(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleFornecedorSelect = (columnIndex: number, fornecedorIdStr: string) => {
        const newFornecedorId = fornecedorIdStr ? parseInt(fornecedorIdStr, 10) : null;
        const oldFornecedorId = selectedFornecedores[columnIndex];

        if (newFornecedorId === oldFornecedorId) return;
        
        if (newFornecedorId && selectedFornecedores.includes(newFornecedorId)) {
            alert("Este fornecedor já foi selecionado em outra coluna.");
            return;
        }

        const applyChange = () => {
            const newCotacoes = { ...cotacoes };
            if (oldFornecedorId) {
                itens.forEach(item => delete newCotacoes[`${item.item_id}-${oldFornecedorId}`]);
            }
            setCotacoes(newCotacoes);

            setSelectedFornecedores(prev => {
                const newSelection = [...prev];
                newSelection[columnIndex] = newFornecedorId;
                return newSelection;
            });
        };

        const hasValues = oldFornecedorId && itens.some(item => cotacoes[`${item.item_id}-${oldFornecedorId}`]);
        if (hasValues && window.confirm("Ao alterar o fornecedor, toda a coluna de valores será apagada. Deseja continuar?")) {
            applyChange();
        } else if (!hasValues) {
            applyChange();
        }
    };

    const handleValorChange = (itemId: number, fornecedorId: number | null, valor: string) => {
        if (fornecedorId) {
            setCotacoes(prev => ({ ...prev, [`${itemId}-${fornecedorId}`]: valor }));
        }
    };

    const handleSaveDraft = async () => {
        const cotacoesParaSalvar = Object.entries(cotacoes).map(([key, valor_unitario]) => {
            const [item_id, fornecedor_id] = key.split('-').map(Number);
            return { item_id, fornecedor_id, valor_unitario: parseFloat(valor_unitario.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0 };
        }).filter(c => c.valor_unitario > 0);
        try {
            await api.post(`/orcamentos/${orcamentoIdFromParams}/cotacao`, { cotacoes: cotacoesParaSalvar });
            alert('Rascunho salvo com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar rascunho:", error);
            alert('Falha ao salvar rascunho.');
        }
    };

    const handleSendToApproval = async () => {
        if (window.confirm("Tem certeza que deseja enviar para aprovação? Você não poderá mais editar as cotações.")) {
            try {
                await handleSaveDraft();
                await api.patch(`/orcamentos/${orcamentoIdFromParams}/status`, { status: 'AGUARDANDO_APROVACAO' });
                alert('Orçamento enviado para aprovação!');
                navigate('/orcamentos');
            } catch (error) {
                console.error("Erro ao enviar para aprovação:", error);
                const errorMessage = (error as any).response?.data?.error || 'Falha ao enviar para aprovação.';
                alert(errorMessage);
            }
        }
    };

    const handleDecisionChange = (itemId: number, field: keyof ApprovalDecision, value: any) => {
        setApprovalDecisions(prev => {
            const newDecisions = { ...prev };
            const currentDecision = { ...newDecisions[itemId] };

            (currentDecision as any)[field] = value;

            // Se o fornecedor mudou, busca a cotação e atualiza o valor unitário
            if (field === 'selectedFornecedorId') {
                const newFornecedorId = value;
                if (newFornecedorId) {
                    const priceStr = cotacoes[`${itemId}-${newFornecedorId}`] || '0';
                    const newPrice = parseFloat(priceStr) || 0;
                    currentDecision.valorUnitario = newPrice;
                } else {
                    currentDecision.valorUnitario = 0; // Reseta se nenhum fornecedor for selecionado
                }
            }

            newDecisions[itemId] = currentDecision;
            return newDecisions;
        });
    };

    const handleProcessApproval = async () => {
        // Validação de Pedido Mínimo antes de enviar
        const totalsByFornecedor: Record<number, { total: number, fornecedor: Fornecedor }> = {};
        fornecedoresCotacao.forEach(f => {
            totalsByFornecedor[f.id] = { total: 0, fornecedor: f };
        });

        Object.values(approvalDecisions).forEach(decision => {
            if (decision.status === 'APROVADO' && decision.selectedFornecedorId) {
                const totalItem = (decision.valorUnitario || 0) * (decision.quantidade || 0);
                if (totalsByFornecedor[decision.selectedFornecedorId]) {
                    totalsByFornecedor[decision.selectedFornecedorId].total += totalItem;
                }
            }
        });

        const fornecedoresComProblema = Object.values(totalsByFornecedor)
            .filter(({ total, fornecedor }) => fornecedor.pedido_minimo && total > 0 && total < fornecedor.pedido_minimo)
            .map(({ fornecedor }) => fornecedor.nome);

        if (fornecedoresComProblema.length > 0) {
            alert(`Aprovação bloqueada. O valor total do pedido para o(s) seguinte(s) fornecedor(es) está abaixo do mínimo exigido: ${fornecedoresComProblema.join(', ')}. Por favor, ajuste as quantidades, troque o fornecedor ou reprove os itens necessários.`);
            return;
        }


        if (window.confirm("Tem certeza que deseja finalizar esta aprovação? A ação não poderá ser desfeita.")) {
            try {
                await api.post(`/orcamentos/${orcamentoIdFromParams}/processar_aprovacao`, { decisions: approvalDecisions });
                alert('Processo de aprovação finalizado com sucesso!');
                navigate('/orcamentos');
            } catch (error) {
                console.error("Erro ao processar aprovação:", error);
                alert('Falha ao finalizar o processo.');
            }
        }
    };

    const handleDeleteOrcamento = async (orcamentoId: number) => {
        if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
            try {
                await api.delete(`/orcamentos/${orcamentoId}`);
                fetchOrcamentos();
            } catch (error) {
                alert('Erro ao excluir orçamento.');
            }
        }
    };

    const renderActionButtons = (orcamento: Orcamento) => {
        return (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {/* Visualizar / Aprovar / Ver Resultado */}
                {['AGUARDANDO_APROVACAO', 'APROVADO_TOTALMENTE', 'APROVADO_PARCIALMENTE', 'REPROVADO_TOTALMENTE'].includes(orcamento.status) && (
                    <Tooltip text={orcamento.status === 'AGUARDANDO_APROVACAO' && canApprove ? 'Analisar Aprovação' : 'Visualizar'}>
                        <button onClick={() => navigate(`/orcamentos/${orcamento.id}`)} style={{ ...styles.iconButton, ...styles.iconButtonGray }}>
                            <FaEye />
                        </button>
                    </Tooltip>
                )}

                {/* Continuar Cotação (editar)*/}
                {orcamento.status === 'EM_ELABORACAO' && canQuote && (
                    <Tooltip text="Continuar Cotação">
                        <button onClick={() => navigate(`/orcamentos/${orcamento.id}`)} style={{ ...styles.iconButton, ...styles.iconButtonBlue }}>
                            <FaPencilAlt />
                        </button>
                    </Tooltip>
                )}

                {/* Excluir */}
                <Tooltip text="Excluir Orçamento">
                    <button onClick={() => handleDeleteOrcamento(orcamento.id)} style={{ ...styles.iconButton, ...styles.iconButtonRed }}>
                        <FaTrash />
                    </button>
                </Tooltip>
            </div>
        );
    };

    const renderListView = () => (
        <div style={styles.container}>
            <h1>Orçamentos</h1>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>ID</th>
                        <th style={styles.th}>Req. ID</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Data</th>
                        <th style={styles.th}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {orcamentos.map(orcamento => (
                        <tr key={orcamento.id}>
                            <td style={styles.td}>{orcamento.id}</td>
                            <td style={styles.td}>{orcamento.requisicao_id}</td>
                            <td style={styles.td}><span style={getStatusBadgeStyle(orcamento.status)}>{orcamento.status.replace(/_/g, ' ')}</span></td>
                            <td style={styles.td}>{new Date(orcamento.data).toLocaleDateString()}</td>
                            <td style={styles.td}>{renderActionButtons(orcamento)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
    
    const renderQuotationView = () => (
        <div style={styles.container}>
            <h1>Cotação de Preços (Orçamento ID: {orcamentoIdFromParams})</h1>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={{...styles.th, minWidth: 250}}>Item (Cód.)</th>
                        {selectedFornecedores.map((fornecedorId, index) => (
                            <th key={index} style={{...styles.th, minWidth: 250}}>
                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                    <select
                                        value={fornecedorId || ''}
                                        onChange={e => handleFornecedorSelect(index, e.target.value)}
                                        style={{...styles.input, width: 'calc(100% - 30px)'}}
                                    >
                                        <option value="">Selecione um Fornecedor</option>
                                        {allFornecedores.map(f => (
                                            <option key={f.id} value={f.id}>{f.nome}</option>
                                        ))}
                                    </select>
                                    <button onClick={() => handleRemoveColumn(index)} style={styles.removeButton}>🗑️</button>
                                </div>
                            </th>
                        ))}
                        <th><button onClick={handleAddColumn} style={styles.addButton}>+</button></th>
                    </tr>
                </thead>
                <tbody>
                    {itens.map(item => (
                        <tr key={item.item_id}>
                            <td style={{...styles.td, fontWeight: 'bold'}}>{item.descricao} ({item.codigo}) - Qtd: {item.quantidade}</td>
                            {selectedFornecedores.map((fornecedorId, index) => (
                                <td key={index} style={styles.td}>
                                    <CurrencyInput
                                        value={cotacoes[`${item.item_id}-${fornecedorId}`] || ''}
                                        onChange={(v) => handleValorChange(item.item_id, fornecedorId, v)}
                                    />
                                </td>
                            ))}
                            <td style={styles.td}></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={styles.actions}>
                <button onClick={handleSaveDraft} style={{...styles.button, backgroundColor: theme.colors.gray}}>Salvar Rascunho</button>
                <button onClick={handleSendToApproval} style={{...styles.button, backgroundColor: theme.colors.green}}>Enviar para Aprovação</button>
            </div>
        </div>
    );

    const renderApprovalView = () => {
        // Calcula totais por fornecedor para checar pedido mínimo
        const totalsByFornecedor = fornecedoresCotacao.reduce((acc, f) => {
            acc[f.id] = { total: 0, fornecedor: f };
            return acc;
        }, {} as Record<number, { total: number, fornecedor: Fornecedor }>);

        Object.keys(approvalDecisions).forEach((itemIdStr) => {
            const itemId = parseInt(itemIdStr, 10);
            const decision = approvalDecisions[itemId];
            const item = itens.find(i => i.item_id === itemId);

            if (decision && decision.status === 'APROVADO' && decision.selectedFornecedorId && item) {
                const priceStr = cotacoes[`${item.item_id}-${decision.selectedFornecedorId}`] || '0';
                const valorUnitario = parseFloat(priceStr) || 0;
                const totalItem = (valorUnitario || 0) * (decision.quantidade || 0);
                if (totalsByFornecedor[decision.selectedFornecedorId] && !isNaN(totalItem)) {
                    totalsByFornecedor[decision.selectedFornecedorId].total += totalItem;
                }
            }
        });


        return (
            <div style={styles.container}>
                <h1>Análise de Orçamento para Aprovação (ID: {orcamentoIdFromParams})</h1>
                 <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Item</th>
                            <th style={styles.th}>Qtd. Req.</th>
                            {fornecedoresCotacao.map(f => <th key={f.id} style={styles.th}>{f.nome}</th>)}
                            <th style={styles.th}>Vencedor</th>
                            <th style={styles.th}>Qtd. a Comprar</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Justificativa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itens.map(item => {
                            const decision = approvalDecisions?.[item?.item_id];
                            if (!decision || !item) return null;

                            const isQtyChanged = decision.quantidade !== item.quantidade;
                            const isRejected = decision.status === 'REPROVADO';
                            const showJustification = (isQtyChanged && decision.quantidade !== item.quantidade) || isRejected;

                            return (
                                <tr key={item.item_id}>
                                    <td style={styles.td}>{item.descricao}</td>
                                    <td style={styles.td}>{item.quantidade}</td>
                                    {fornecedoresCotacao.map(f => (
                                        <td key={f.id} style={{...styles.td, backgroundColor: decision.selectedFornecedorId === f.id ? '#d4edda' : 'transparent' }}>
                                            {cotacoes[`${item.item_id}-${f.id}`] ? `R$ ${cotacoes[`${item.item_id}-${f.id}`]}` : ' - '}
                                        </td>
                                    ))}
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                            <select 
                                                value={decision.selectedFornecedorId || ''}
                                                onChange={(e) => handleDecisionChange(item.item_id, 'selectedFornecedorId', e.target.value ? Number(e.target.value) : null)}
                                                style={styles.input}
                                                disabled={!canApprove || isRejected}
                                            >
                                                <option value="">Nenhum</option>
                                                {fornecedoresCotacao.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                            </select>
                                            {decision.selectedFornecedorId &&
                                             totalsByFornecedor[decision.selectedFornecedorId] &&
                                             (totalsByFornecedor[decision.selectedFornecedorId].total > 0) &&
                                             (totalsByFornecedor[decision.selectedFornecedorId].total < (Number(totalsByFornecedor[decision.selectedFornecedorId].fornecedor.pedido_minimo) || 0)) &&
                                             (<span>⚠️</span>)
                                            }
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <input 
                                            type="number"
                                            value={decision.quantidade}
                                            onChange={(e) => handleDecisionChange(item.item_id, 'quantidade', Number(e.target.value))}
                                            style={styles.input}
                                            disabled={!canApprove || isRejected}
                                        />
                                    </td>
                                    <td style={styles.td}>
                                        <select
                                            value={decision.status}
                                            onChange={e => handleDecisionChange(item.item_id, 'status', e.target.value as 'APROVADO' | 'REPROVADO')}
                                            style={styles.input}
                                            disabled={!canApprove}
                                        >
                                            <option value="APROVADO">Aprovar</option>
                                            <option value="REPROVADO">Reprovar</option>
                                        </select>
                                    </td>
                                    <td style={styles.td}>
                                        {showJustification && (
                                            <input
                                                type="text"
                                                value={decision.justificativa}
                                                onChange={(e) => handleDecisionChange(item.item_id, 'justificativa', e.target.value)}
                                                style={styles.input}
                                                placeholder="Justificativa obrigatória"
                                                disabled={!canApprove}
                                            />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div style={{marginTop: '30px'}}>
                    <h3>Resumo dos Pedidos por Fornecedor</h3>
                    {Object.values(totalsByFornecedor).map(({ total, fornecedor }) => {
                        if (total === 0) return null;
                        const pedidoMinimo = Number(fornecedor.pedido_minimo) || 0;
                        const atingeMinimo = total >= pedidoMinimo;
                        return (
                            <div key={fornecedor.id} style={{...styles.totalCard, borderColor: atingeMinimo ? theme.colors.green : theme.colors.red}}>
                                <h4>{fornecedor.nome}</h4>
                                <p>Total do Pedido: R$ {(total || 0).toFixed(2)}</p>
                                <p>Pedido Mínimo: R$ {(pedidoMinimo || 0).toFixed(2)}</p>
                                {!atingeMinimo && <p style={{color: theme.colors.red, fontWeight: 'bold'}}>⚠️ Pedido abaixo do mínimo!</p>}
                            </div>
                        )
                    })}
                </div>
                {canApprove && (
                    <div style={styles.actions}>
                        <button onClick={handleProcessApproval} style={{...styles.button, backgroundColor: theme.colors.green}}>Finalizar Aprovação</button>
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return <div style={styles.container}>Carregando...</div>;
    }
    
    if (orcamentoIdFromParams) {
        if (status === 'EM_ELABORACAO') return renderQuotationView();
        if (status === 'AGUARDANDO_APROVACAO' || status.startsWith('APROVADO') || status.startsWith('REPROVADO')) return renderApprovalView();
        return <div>Carregando dados do orçamento...</div>;
    }

    return renderListView();
};

const getStatusBadgeStyle = (status: string): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
        padding: '4px 8px',
        borderRadius: '12px',
        fontWeight: 'bold',
        fontSize: '12px',
        color: '#fff',
        textTransform: 'uppercase'
    };
    switch (status) {
        case 'EM_ELABORACAO': return { ...baseStyle, backgroundColor: '#007bff' };
        case 'AGUARDANDO_APROVACAO': return { ...baseStyle, backgroundColor: '#ffc107', color: '#000' };
        case 'APROVADO_TOTALMENTE': return { ...baseStyle, backgroundColor: '#28a745' };
        case 'APROVADO_PARCIALMENTE': return { ...baseStyle, backgroundColor: '#17a2b8' };
        case 'REPROVADO_TOTALMENTE': return { ...baseStyle, backgroundColor: '#dc3545' };
        default: return { ...baseStyle, backgroundColor: '#6c757d' };
    }
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { padding: 32, fontFamily: 'Arial, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { color: theme.colors.blueDark, margin: 0 },
    button: {
        background: theme.colors.blue,
        color: '#fff', border: 'none', borderRadius: 4,
        padding: '10px 16px', cursor: 'pointer', fontSize: 16, fontWeight: 600,
    },
    table: { width: '100%', borderCollapse: 'collapse' as 'collapse', minWidth: 800, },
    th: {
        background: '#f2f2f2', border: '1px solid #ddd',
        padding: 12, textAlign: 'center' as 'center', color: '#333',
    },
    td: { border: '1px solid #ddd', padding: 8, textAlign: 'center' as 'center' },
    input: {
        width: '100%', padding: 8, border: '1px solid #ccc',
        borderRadius: 4, boxSizing: 'border-box' as 'border-box',
        textAlign: 'right' as 'right'
    },
    actionsContainer: {
        display: 'flex',
        gap: '16px',
    },
    successButton: {
        background: theme.colors.green,
    },
    deleteButton: {
        background: theme.colors.red,
    },
    statusText: {
        fontWeight: 'bold',
        fontSize: '1.1em'
    },
    vendorSelection: { display: 'flex', flexDirection: 'column' as 'column', gap: '8px', textAlign: 'left' as 'left' },
    radioContainer: { display: 'flex', alignItems: 'center', gap: '8px'},
    justificationInput: { width: '100%', marginTop: '8px', padding: '4px', border: '1px solid #ccc', borderRadius: 4, minHeight: '50px'},
    addButton: {
        width: '30px',
        height: '30px',
        borderRadius: '5px',
        border: 'none',
        backgroundColor: theme.colors.green,
        color: 'white',
        fontSize: '20px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    removeButton: {
        width: '24px',
        height: '24px',
        marginLeft: '5px',
        border: 'none',
        borderRadius: '5px',
        backgroundColor: theme.colors.red,
        color: 'white',
        cursor: 'pointer',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    approveButton: {
        padding: '5px 10px',
        border: 'none',
        borderRadius: '5px',
        backgroundColor: theme.colors.green,
        color: 'white',
        cursor: 'pointer',
    },
    reproveButton: {
        padding: '5px 10px',
        border: 'none',
        borderRadius: '5px',
        backgroundColor: theme.colors.red,
        color: 'white',
        cursor: 'pointer',
    },
    totalsContainer: {
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap'
    },
    totalCard: {
        border: '2px solid',
        borderRadius: '8px',
        padding: '15px',
        minWidth: '250px'
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
    iconButtonGray: { color: theme.colors.gray },
    iconButtonBlue: { color: theme.colors.blue },
    iconButtonRed: { color: theme.colors.red },
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
};

export default OrcamentoCotacao; 