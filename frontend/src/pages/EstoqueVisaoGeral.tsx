import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { theme } from '../styles/theme';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface ResumoEstoque {
  valor_total: number;
  itens_baixo_estoque: number;
  total_itens: number;
}

interface AlertaEstoque {
  filial_id: number;
  filial_nome: string;
  item_id: number;
  codigo: string;
  descricao: string;
  estoque_minimo: number;
  quantidade: number;
}

const cardStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 200,
  padding: 16,
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const cardTitle: React.CSSProperties = { color: '#555', fontSize: 14, marginBottom: 8 };
const cardValue: React.CSSProperties = { fontSize: 24, fontWeight: 700 };

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', background: theme.colors.blueLight, color: '#fff' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #eee' };

const EstoqueVisaoGeral: React.FC = () => {
  const [resumo, setResumo] = useState<ResumoEstoque | null>(null);
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);

  useEffect(() => {
    api.get('/estoque/resumo').then(({ data }) => setResumo(data));
    api.get('/estoque/alertas').then(({ data }) => setAlertas(data));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 24 }}>Visão Geral de Estoque</h2>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <span style={cardTitle}>Valor Total em Estoque</span>
          <strong style={cardValue}>{resumo ? resumo.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '...'}</strong>
        </div>
        <div style={cardStyle}>
          <span style={cardTitle}>Itens abaixo do mínimo</span>
          <strong style={cardValue}>{resumo ? resumo.itens_baixo_estoque : '...'}</strong>
        </div>
        <div style={cardStyle}>
          <span style={cardTitle}>Total de Itens</span>
          <strong style={cardValue}>{resumo ? resumo.total_itens : '...'}</strong>
        </div>
      </div>

      {/* Alert Table */}
      <h3 style={{ marginTop: 40 }}>Alertas de Estoque</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Filial</th>
            <th style={thStyle}>Código</th>
            <th style={thStyle}>Descrição</th>
            <th style={thStyle}>Quantidade</th>
            <th style={thStyle}>Mínimo</th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((row) => (
            <tr key={`${row.filial_id}-${row.item_id}`}>
              <td style={tdStyle}>{row.filial_nome}</td>
              <td style={tdStyle}>{row.codigo}</td>
              <td style={tdStyle}>{row.descricao}</td>
              <td style={{ ...tdStyle, color: theme.colors.red, textAlign: 'right' }}>{row.quantidade}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{row.estoque_minimo}</td>
            </tr>
          ))}
          {alertas.length === 0 && (
            <tr>
              <td colSpan={5} style={{ ...tdStyle, textAlign: 'center' }}>Sem alertas no momento 🎉</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Placeholder gráfico consumo × compras */}
      <h3 style={{ marginTop: 40 }}>Consumo × Compras (últimos meses)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={[
          { mes: 'Jan', consumo: 400, compras: 240 },
          { mes: 'Fev', consumo: 300, compras: 139 },
          { mes: 'Mar', consumo: 200, compras: 980 },
        ]}>
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="consumo" fill={theme.colors.blueDark} />
          <Bar dataKey="compras" fill={theme.colors.blueLight} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EstoqueVisaoGeral; 