import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { theme } from '../styles/theme';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';

interface Requisicao {
  id: number;
  data_requisicao: string;
  status: string;
  solicitante_nome: string;
  departamento?: string;
  justificativa?: string;
  filial_nome?: string;
}

interface ItemEstoque {
  id: number;
  codigo: string;
  descricao: string;
}

interface Item {
    id: number;
    codigo: string;
    descricao: string;
    unidade_medida: string;
    saldo_estoque: number;
    categoria_id: number;
    categoria_nome?: string;
}

interface RequisicaoItem {
    item_id: number;
    codigo: string;
    descricao: string;
    quantidade: number;
}

interface Filial {
  id: number;
  endereco: string;
}

const Requisicoes: React.FC = () => {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [itensRequisicao, setItensRequisicao] = useState<RequisicaoItem[]>([]);
  const [selectedRequisicao, setSelectedRequisicao] = useState<Requisicao | null>(null);

  // State for the new requisition modal
  const [itensEstoque, setItensEstoque] = useState<Item[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [selectedFilial, setSelectedFilial] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ value: number; label: string } | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [departamento, setDepartamento] = useState('');
  const [justificativa, setJustificativa] = useState('');
  
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<number>(1);
  const [editingRequisicaoId, setEditingRequisicaoId] = useState<number | null>(null);
  
  const [carregandoCriticos, setCarregandoCriticos] = useState(false);

  // === Filtros ===
  const statusOptions = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'PENDENTE', label: 'Pendente' },
    { value: 'AGUARDANDO_COTACAO', label: 'Cotação' },
    { value: 'AGUARDANDO_APROVACAO', label: 'Aprovação' },
    { value: 'PEDIDO', label: 'Pedido' },
    { value: 'AGUARDANDO_RECEBIMENTO', label: 'Recebimento' },
    { value: 'RECEBIDO', label: 'Recebido' },
    { value: 'FINALIZADA', label: 'Finalizada' }
  ];
  const [selectedStatus, setSelectedStatus] = useState<{ value: string; label: string }>(statusOptions[0]);

  const filteredRequisicoes = selectedStatus.value === 'TODOS'
    ? requisicoes
    : requisicoes.filter(r => r.status === selectedStatus.value);

  // === Paginação ===
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const displayedRequisicoes = filteredRequisicoes.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredRequisicoes.length / itemsPerPage);
  
  const navigate = useNavigate();

  const fetchRequisicoes = useCallback(async () => {
    try {
      const response = await api.get('/requisicoes');
      setRequisicoes(response.data);
    } catch (error) {
      console.error("Erro ao buscar requisições:", error);
    }
  }, []);

  const fetchItensEstoque = useCallback(async () => {
    try {
      const response = await api.get('/item_estoque');
      setItensEstoque(response.data);
    } catch (error) {
      console.error("Erro ao buscar itens de estoque:", error);
    }
  }, []);

  const fetchFiliais = useCallback(async () => {
    try {
      const response = await api.get('/filiais');
      setFiliais(response.data);
    } catch (error) {
      console.error("Erro ao buscar filiais:", error);
    }
  }, []);

  useEffect(() => {
    fetchRequisicoes();
    fetchItensEstoque();
    fetchFiliais();
  }, [fetchRequisicoes, fetchItensEstoque, fetchFiliais]);

  const handleOpenNewModal = () => {
    setItensRequisicao([]);
    setSelectedItem(null);
    setQuantidade(1);
    setDepartamento('');
    setJustificativa('');
    setSelectedFilial(null);
    setIsNewModalOpen(true);
    setEditingRequisicaoId(null);
  };

  const handleCloseNewModal = () => {
    setIsNewModalOpen(false);
  };

  const handleViewModal = async (requisicao: Requisicao) => {
    try {
        const response = await api.get(`/requisicoes/${requisicao.id}`);
        setSelectedRequisicao(response.data);
        setItensRequisicao(response.data.itens || []);
        setIsViewModalOpen(true);
    } catch (error) {
        console.error("Erro ao buscar detalhes da requisição:", error);
        alert('Falha ao carregar detalhes da requisição.');
    }
  };
  
  const handleCloseViewModal = () => setIsViewModalOpen(false);

  const handleAddItem = () => {
    if (selectedItem && quantidade > 0) {
        const isItemInList = itensRequisicao.some(item => item.item_id === selectedItem.value);
        if (isItemInList) {
            alert('Este item já foi adicionado à requisição.');
            return;
        }
        
        const [codigo, ...descricaoParts] = selectedItem.label.split(' - ');
        const descricao = descricaoParts.join(' - ');

        const novoItem: RequisicaoItem = {
            item_id: selectedItem.value,
            codigo: codigo,
            descricao: descricao,
            quantidade: quantidade
        };

        setItensRequisicao(prev => [...prev, novoItem]);
        setSelectedItem(null);
        setQuantidade(1);
    }
  };

  const handleEditItem = (item: RequisicaoItem) => {
    setEditingItemId(item.item_id);
    setEditingQuantity(item.quantidade);
  };

  const handleUpdateItem = (itemId: number) => {
    setItensRequisicao(prev =>
        prev.map(item =>
            item.item_id === itemId ? { ...item, quantidade: editingQuantity } : item
        )
    );
    setEditingItemId(null);
  };

  const handleRemoveItem = (itemId: number) => {
    setItensRequisicao(itensRequisicao.filter(item => item.item_id !== itemId));
  };
  
  const handleGerarRequisicao = async () => {
    if (itensRequisicao.length === 0) {
      alert("Adicione pelo menos um item à requisição.");
      return;
    }
    
    console.log('[LOG] Iniciando handleGerarRequisicao');

    try {
      // Assumindo que o objeto do usuário está salvo no localStorage após o login
      const userData = localStorage.getItem('user');
      if (!userData) {
        alert("Erro de autenticação. Por favor, faça login novamente.");
        console.error('[ERRO] Usuário não encontrado no localStorage.');
        return;
      }
      const user = JSON.parse(userData);
      console.log('[LOG] Dados do usuário carregados:', user);


      if (!selectedFilial) {
        alert("Por favor, selecione uma filial.");
        console.error('[ERRO] Nenhuma filial selecionada.');
        return;
      }
      console.log('[LOG] Filial selecionada:', selectedFilial);

      const payload = {
          solicitante_id: user.id,
          filial_id: selectedFilial,
          departamento,
          justificativa,
          itens: itensRequisicao.map(item => ({ item_id: item.item_id, quantidade: item.quantidade }))
      };

      console.log('[LOG] Payload a ser enviado para a API:', JSON.stringify(payload, null, 2));

      if (editingRequisicaoId) {
        // Atualizar requisição existente
        await api.put(`/requisicoes/${editingRequisicaoId}`, payload);
        alert('Requisição atualizada com sucesso!');
        console.log(`[LOG] Requisição ${editingRequisicaoId} atualizada com sucesso!`);
      } else {
        // Criar nova requisição
        await api.post('/requisicoes', payload);
        alert('Requisição criada com sucesso!');
        console.log('[LOG] Requisição criada com sucesso!');
      }

      fetchRequisicoes();
      handleCloseNewModal();
    } catch (error: any) {
      console.error('[ERRO DETALHADO] Falha ao criar/atualizar requisição:', error);
      if (error.response) {
        // O servidor respondeu com um status de erro
        console.error('[ERRO] Dados da resposta:', error.response.data);
        console.error('[ERRO] Status da resposta:', error.response.status);
        console.error('[ERRO] Headers da resposta:', error.response.headers);
        alert(`Falha ao criar/atualizar requisição. Erro do servidor: ${error.response.data.detail || error.response.data.error}`);
      } else if (error.request) {
        // A requisição foi feita, mas não houve resposta
        console.error('[ERRO] Nenhuma resposta recebida do servidor:', error.request);
        alert('Falha ao criar/atualizar requisição. O servidor não respondeu.');
      } else {
        // Algo aconteceu ao configurar a requisição que disparou um erro
        console.error('[ERRO] Erro ao configurar a requisição:', error.message);
        alert('Falha ao criar/atualizar requisição. Ocorreu um erro inesperado.');
      }
    }
  };

  const handleDeleteRequisicao = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta requisição?')) {
      try {
        await api.delete(`/requisicoes/${id}`);
        alert('Requisição excluída com sucesso!');
        fetchRequisicoes();
      } catch (error) {
        console.error("Erro ao excluir requisição:", error);
        alert('Falha ao excluir requisição.');
      }
    }
  };

  const handleEditRequisicao = async (requisicao: Requisicao) => {
    try {
      const response = await api.get(`/requisicoes/${requisicao.id}`);
      const dadosRequisicao = response.data;
      
      setEditingRequisicaoId(requisicao.id); // Guardar o ID para a atualização
      setSelectedFilial(dadosRequisicao.filial_id);
      setDepartamento(dadosRequisicao.departamento);
      setJustificativa(dadosRequisicao.justificativa);
      
      const itensFormatados = dadosRequisicao.itens.map((item: any) => ({
        item_id: item.item_id,
        codigo: item.codigo,
        descricao: item.descricao,
        quantidade: item.quantidade
      }));
      
      setItensRequisicao(itensFormatados);
      setIsNewModalOpen(true);

    } catch (error) {
      console.error("Erro ao carregar dados para edição:", error);
      alert('Falha ao carregar dados da requisição para edição.');
    }
  };

  const handleNavigateToOrcamento = (requisicaoId: number) => {
    navigate(`/orcamentos?requisicaoId=${requisicaoId}`);
  };

  const itemOptions = itensEstoque.map(item => ({
    value: item.id,
    label: `${item.codigo || 'S/C'} - ${item.descricao}`
  }));

  const getStatusBadgeStyle = (status: string): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: '4px 8px',
      borderRadius: '12px',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '12px',
      textTransform: 'uppercase'
    };
    switch (status) {
      case 'APROVADA':
        return { ...baseStyle, backgroundColor: theme.colors.green };
      case 'PENDENTE':
        return { ...baseStyle, backgroundColor: theme.colors.orange };
      case 'REPROVADA':
        return { ...baseStyle, backgroundColor: theme.colors.red };
      case 'AGUARDANDO_COTACAO':
          return { ...baseStyle, backgroundColor: theme.colors.blue };
      case 'AGUARDANDO_APROVACAO':
          return { ...baseStyle, backgroundColor: '#ffc107', color: '#000' };
      default:
        return { ...baseStyle, backgroundColor: theme.colors.gray };
    }
  };

  const handleAddCriticos = async () => {
    if(carregandoCriticos) return;
    try{
      setCarregandoCriticos(true);
      const { data } = await api.get('/estoque/alertas');
      const itensNovos:RequisicaoItem[] = [];
      data.forEach((a:any)=>{
         if(selectedFilial && Number(selectedFilial)!==a.filial_id) return; // considera só filial escolhida se houver
         const falta = a.estoque_minimo - a.quantidade;
         if(falta<=0) return;
         if(itensRequisicao.some(it=>it.item_id===a.item_id)) return;
         itensNovos.push({ item_id:a.item_id, codigo:a.codigo, descricao:a.descricao, quantidade: falta });
      });
      if(itensNovos.length===0){ alert('Sem itens críticos para adicionar.'); }
      else setItensRequisicao(prev=>[...prev, ...itensNovos]);
    }catch(err){ console.error('Erro ao buscar alertas',err); alert('Falha ao buscar itens críticos');}
    finally{ setCarregandoCriticos(false);}
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Requisições</h1>
        <button style={styles.button} onClick={handleOpenNewModal}>Nova Requisição</button>
      </div>

      {/* === Barra de filtros === */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: 24 }}>
        <div style={{ minWidth: 200 }}>
          <Select
            options={statusOptions}
            value={selectedStatus}
            onChange={(opt) => { if(opt) { setSelectedStatus(opt); setCurrentPage(1);} }}
            placeholder="Filtrar por status"
          />
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Data</th>
            <th style={styles.th}>Solicitante</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {requisicoes.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '16px' }}>Nenhuma requisição encontrada.</td>
            </tr>
          ) : (
            displayedRequisicoes.map(req => (
              <tr key={req.id}>
                <td style={styles.td}>{req.id}</td>
                <td style={styles.td}>{new Date(req.data_requisicao).toLocaleDateString()}</td>
                <td style={styles.td}>{req.solicitante_nome}</td>
                <td style={styles.td}><span style={getStatusBadgeStyle(req.status)}>{req.status}</span></td>
                <td style={styles.td}>
                  <button style={{...styles.actionButton, background: theme.colors.blue}} onClick={() => handleViewModal(req)} title="Visualizar Itens">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                      <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                    </svg>
                  </button>
                  {req.status === 'PENDENTE' && (
                    <>
                      <button style={{...styles.actionButton, background: theme.colors.yellow}} onClick={() => handleEditRequisicao(req)} title="Editar Requisição">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
                        </svg>
                      </button>
                      <button type="button"
                              style={{...styles.actionButton, background: theme.colors.green}}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavigateToOrcamento(req.id); }}
                              title="Gerar Orçamento">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM5 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm7 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM4.33 4L5.21 8h7.48l1.2-4H4.33z"/>
                        </svg>
                      </button>
                      <button style={{...styles.actionButton, background: theme.colors.red}} onClick={() => handleDeleteRequisicao(req.id)} title="Excluir Requisição">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                      </button>
                    </>
                  )}
                  {req.status === 'AGUARDANDO_ORCAMENTO' && (
                    <button type="button"
                            style={{...styles.actionButton, background: theme.colors.green}}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavigateToOrcamento(req.id); }}
                            title="Gerar Orçamento">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM5 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm7 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM4.33 4L5.21 8h7.48l1.2-4H4.33z"/>
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} style={styles.pageBtn}>Anterior</button>
          {Array.from({length: totalPages},(_,i)=>i+1).map(pn=> (
            <button key={pn} onClick={()=>setCurrentPage(pn)} style={pn===currentPage?styles.pageBtnActive:styles.pageBtn}>{pn}</button>
          ))}
          <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} style={styles.pageBtn}>Próxima</button>
        </div>
      )}

      {isNewModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <h2>Nova Requisição</h2>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label>Filial</label>
                <Select
                    options={filiais.map(f => ({ value: f.id, label: f.endereco }))}
                    onChange={(option) => setSelectedFilial(option ? option.value : null)}
                    placeholder="Selecione a Filial"
                    isClearable
                    styles={{ control: (base) => ({ ...base, minHeight: 40 }) }}
                 />
              </div>
              <div style={{ flex: 1 }}>
                <label>Departamento</label>
                <input
                  type="text"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  style={styles.input}
                  placeholder="Ex: Manutenção, Escritório"
                />
              </div>
              <div style={{ flex: 2 }}>
                <label>Justificativa</label>
                <input
                  type="text"
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  style={styles.input}
                  placeholder="Ex: Reposição de estoque mensal"
                />
              </div>
            </div>

            <div style={styles.addItemForm}>
              <div style={{ flex: 3, marginRight: 16 }}>
                <label>Item</label>
                <Select
                  options={itemOptions}
                  value={selectedItem}
                  onChange={(option) => setSelectedItem(option as any)}
                  placeholder="Digite o código ou a descrição do item..."
                  isClearable
                  styles={{ control: (base) => ({ ...base, minHeight: 40 }) }}
                />
              </div>
              <div style={{ flex: 1, marginRight: 16 }}>
                 <label>Quantidade</label>
                 <input
                    type="number"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    style={styles.input}
                    min="1"
                 />
              </div>
              <button onClick={handleAddItem} style={{...styles.button, marginRight:8}}>Adicionar</button>
              <button onClick={handleAddCriticos} style={{...styles.button, background:theme.colors.orange}} title="Adicionar itens com estoque crítico">
                 {carregandoCriticos ? 'Carregando...' : <><FaExclamationTriangle/> Itens Críticos</>}
              </button>
            </div>

            <div style={styles.cartList}>
               {itensRequisicao.length === 0 ? <p>Nenhum item adicionado.</p> : (
                 <ul style={styles.itemList}>
                   {itensRequisicao.map(item => (
                     <li key={item.item_id} style={styles.listItem}>
                       <span>{`${item.codigo} - ${item.descricao}`}</span>
                       <div style={{ display: 'flex', alignItems: 'center' }}>
                         {editingItemId === item.item_id ? (
                           <>
                             <input
                               type="number"
                               value={editingQuantity}
                               onChange={(e) => setEditingQuantity(Number(e.target.value))}
                               style={{ ...styles.input, width: '60px', marginRight: '8px' }}
                               autoFocus
                             />
                             <button onClick={() => handleUpdateItem(item.item_id)} style={{...styles.iconButton, background: theme.colors.green}} title="Salvar">
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                 <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
                               </svg>
                             </button>
                           </>
                         ) : (
                           <>
                             <span>Qtd: {item.quantidade}</span>
                             <div style={{ marginLeft: '16px', display: 'flex', gap: '8px' }}>
                               <button onClick={() => handleEditItem(item)} style={styles.iconButton} title="Editar Item">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#fff" viewBox="0 0 16 16">
                                   <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V12h2.293L12.793 5.5z"/>
                                 </svg>
                               </button>
                               <button onClick={() => handleRemoveItem(item.item_id)} style={{...styles.iconButton, ...styles.deleteButton}} title="Excluir Item">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#fff" viewBox="0 0 16 16">
                                   <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                   <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                 </svg>
                               </button>
                             </div>
                           </>
                         )}
                       </div>
                     </li>
                   ))}
                 </ul>
               )}
            </div>
            
            <div style={styles.modalActions}>
                <button onClick={handleGerarRequisicao} style={styles.button}>Gerar Requisição</button>
                <button onClick={handleCloseNewModal} style={{...styles.button, ...styles.cancelButton}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedRequisicao && (
         <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <h2>Detalhes da Requisição #{selectedRequisicao.id}</h2>
            <p><strong>Status:</strong> {selectedRequisicao.status}</p>
            <p><strong>Solicitante:</strong> {selectedRequisicao.solicitante_nome}</p>
            <p><strong>Filial:</strong> {selectedRequisicao.filial_nome || 'Não informada'}</p>
            <p><strong>Departamento:</strong> {selectedRequisicao.departamento || 'Não informado'}</p>
            <p><strong>Justificativa:</strong> {selectedRequisicao.justificativa || 'Não informada'}</p>
            
             <h4>Itens da Requisição</h4>
             <div style={styles.cartList}>
               {itensRequisicao.length === 0 ? <p>Nenhum item encontrado.</p> : (
                 itensRequisicao.map(item => (
                    <div key={item.item_id} style={styles.cartItem}>
                      <span>{item.codigo} - {item.descricao} (Qtd: {item.quantidade})</span>
                    </div>
                  ))
               )}
            </div>

            <div style={styles.modalActions}>
                <button onClick={handleCloseViewModal} style={{...styles.button, ...styles.cancelButton}}>Fechar</button>
            </div>
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
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 24 },
  cancelButton: {
    background: '#ccc',
    color: '#333',
  },
  addItemForm: {
      display: 'flex',
      alignItems: 'flex-end',
      marginBottom: 24
  },
  input: {
      width: '100%',
      padding: 8,
      border: '1px solid #ccc',
      borderRadius: 4,
      boxSizing: 'border-box' as 'border-box',
      height: 40
  },
  cartList: { 
      minHeight: 100, 
      maxHeight: 300, 
      overflowY: 'auto' as 'auto', 
      background: '#f9f9f9', 
      padding: 8, 
      borderRadius: 4,
      marginBottom: 24
  },
  cartItem: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '8px', 
      borderBottom: '1px solid #eee' 
  },
  deleteButton: {
      background: theme.colors.red,
  },
  iconButton: {
      background: theme.colors.blue,
      border: 'none',
      borderRadius: '4px',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: '0',
  },
  itemList: {
      listStyleType: 'none',
      padding: 0,
  },
  listItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 8px',
      borderBottom: '1px solid #eee',
  },
  status: {
      PENDENTE: { backgroundColor: theme.colors.orange, color: '#fff' },
      APROVADA: { backgroundColor: theme.colors.green, color: '#fff' },
      REPROVADA: { backgroundColor: theme.colors.red, color: '#fff' },
      AGUARDANDO_COTACAO: { backgroundColor: theme.colors.blue, color: '#fff' },
      EM_ORCAMENTO: { backgroundColor: theme.colors.blueLight2, color: '#fff' },
  },
  statusBase: {
      padding: '4px 8px',
      borderRadius: 12,
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
  },
  pagination:{ marginTop:16, display:'flex', gap:4 },
  pageBtn:{ padding:'4px 10px', border:'1px solid #ccc', background:'#fff', cursor:'pointer' },
  pageBtnActive:{ padding:'4px 10px', border:'1px solid', background: theme.colors.blueLight1 },
};

export default Requisicoes; 