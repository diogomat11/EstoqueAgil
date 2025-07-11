import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { theme } from '../styles/theme';
import RequisicaoModal from './RequisicaoModal';

interface Card {
  id: number;
  tipo: string; // etapa
  status: string;
  data: string;
  responsavel?: string;
}

const columns = [
  { key: 'REQUISICAO', label: 'Requisição' },
  { key: 'COTACAO', label: 'Cotação' },
  { key: 'APROVACAO', label: 'Aprovação' },
  { key: 'PEDIDO', label: 'Pedido' },
  { key: 'RECEBIMENTO', label: 'Recebimento' },
  { key: 'CONCLUIDO', label: 'Concluído' }
];

const KanbanCompras: React.FC = () => {
  const [cards, setCards] = useState<Record<string, Card[]>>({});
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState<any | null>(null);

  useEffect(() => {
    api.get('/dashboard/kanban').then(({ data }) => {
      const grouped: Record<string, Card[]> = {};
      columns.forEach(c => (grouped[c.key] = []));

      const mapColumn = (card: Card): string => card.tipo;

      (data as Card[]).forEach(card => {
        const col = mapColumn(card);
        grouped[col].push(card);
      });
      setCards(grouped);
      setLoading(false);
    });
  }, []);

  const openModal = async (reqId: number) => {
    try {
      const { data } = await api.get(`/requisicoes/${reqId}`);
      setModalData(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div>Carregando quadro Kanban...</div>;

  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', marginTop: 40 }}>
      {columns.map(col => (
        <div key={col.key} style={{ minWidth: 220, background: '#f1f5f9', borderRadius: 8, padding: 8, flex: '0 0 220px' }}>
          <h4 style={{ textAlign: 'center', color: theme.colors.blueDark }}>
            {col.label} ({cards[col.key]?.length || 0})
          </h4>
          {cards[col.key]?.map(c => (
            <div key={c.tipo + c.id} style={{ background: '#fff', padding: 8, borderRadius: 6, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontSize: 12 }}>
              <strong>REQ #{c.id}</strong>
              <div>{new Date(c.data).toLocaleDateString()}</div>
              <span style={{ fontSize: 11, color: '#555' }}>{c.responsavel || '-'}</span>
              <button onClick={() => openModal(c.id)}>Ver Detalhes</button>
            </div>
          ))}
        </div>
      ))}
      {modalData && <RequisicaoModal data={modalData} onClose={() => setModalData(null)} />}
    </div>
  );
};

export default KanbanCompras; 