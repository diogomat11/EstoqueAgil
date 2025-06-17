import { Request, Response } from 'express';
import { pool } from '../database';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

export const importFornecedores = async (req: Request, res: Response) => {
  const filePath = path.join(__dirname, '../../fornecedores.csv');
  const fornecedores: any[] = [];

  fs.createReadStream(filePath)
    .pipe(parse({ columns: true, delimiter: ';' }))
    .on('data', (row) => fornecedores.push(row))
    .on('end', async () => {
      try {
        for (const fornecedor of fornecedores) {
          if (!fornecedor.nome || fornecedor.nome.trim() === '') continue; // Ignora linhas sem nome
          // 1. Insere o fornecedor
          const result = await pool.query(
            'INSERT INTO fornecedor (nome, cnpj, nome_contato, telefone_contato, email, pedido_minimo) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (nome) DO UPDATE SET nome=EXCLUDED.nome RETURNING id',
            [
              fornecedor.nome,
              fornecedor.cnpj || null,
              fornecedor.nome_contato,
              fornecedor.telefone_contato,
              fornecedor.email,
              fornecedor.pedido_minimo === '' ? null : fornecedor.pedido_minimo
            ]
          );
          const fornecedorId = result.rows[0].id;

          // 2. Relaciona tipos de faturamento
          if (fornecedor.tipos_faturamento) {
            const tipos = fornecedor.tipos_faturamento.split(',').map((t: string) => t.trim());
            for (const tipoNome of tipos) {
              // Insere o tipo se não existir
              const tipoResult = await pool.query(
                'INSERT INTO tipo_faturamento (nome) VALUES ($1) ON CONFLICT (nome) DO UPDATE SET nome=EXCLUDED.nome RETURNING id',
                [tipoNome]
              );
              const tipoId = tipoResult.rows[0].id;
              // Relaciona fornecedor e tipo
              await pool.query(
                'INSERT INTO fornecedor_tipo_faturamento (fornecedor_id, tipo_faturamento_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [fornecedorId, tipoId]
              );
            }
          }
        }
        res.json({ success: true, count: fornecedores.length });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });
};

export const importFiliais = async (req: Request, res: Response) => {
  const filePath = path.join(__dirname, '../../RelacaoItens.csv');
  const filiais: any[] = [];

  fs.createReadStream(filePath)
    .pipe(parse({ columns: true, delimiter: ';' }))
    .on('data', (row) => filiais.push(row))
    .on('end', async () => {
      try {
        for (const filial of filiais) {
          await pool.query(
            'INSERT INTO filial (cnpj, endereco, telefone, empresa_id) VALUES ($1, $2, $3, $4) ON CONFLICT (cnpj) DO NOTHING',
            [
              filial.cnpj,
              filial.endereco,
              filial.telefone,
              filial.empresa_id
            ]
          );
        }
        res.json({ success: true, count: filiais.length });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });
};

export const importItens = async (req: Request, res: Response) => {
  const filePath = path.join(__dirname, '../../itens.csv');
  const itens: any[] = [];

  fs.createReadStream(filePath)
    .pipe(parse({ columns: true, delimiter: ';' }))
    .on('data', (row) => itens.push(row))
    .on('end', async () => {
      try {
        for (const item of itens) {
          try {
            // Validação de campos obrigatórios para todos os itens
            if (!item.codigo || !item.descricao || !item.tipo_unid || !item.estoque_min) {
              continue;
            }

            // Busca o id do tipo de fornecedor, se informado
            let tipo_fornecedor_id = null;
            let tipoNome = null;
            if (item.tipo_fornecedor_id && item.tipo_fornecedor_id !== '') {
              const tipoResult = await pool.query(
                'SELECT id, nome FROM tipo_fornecedor WHERE id = $1',
                [item.tipo_fornecedor_id]
              );
              if (tipoResult.rowCount === 0) {
                continue;
              }
              tipo_fornecedor_id = tipoResult.rows[0].id;
              tipoNome = tipoResult.rows[0].nome;
            }

            // Validação para COMODATO
            if (tipoNome === 'COMODATO') {
              if (!item.fornecedor_id || !item.valor || !item.validade_negociacao) {
                continue;
              }
            }

            // Insert
            await pool.query(
              `INSERT INTO item_estoque
                (codigo, descricao, tipo_unid, estoque_min, estoque_atual, valor, fornecedor_id, validade_negociacao, tipo_fornecedor_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (codigo) DO UPDATE SET
                  descricao=EXCLUDED.descricao,
                  tipo_unid=EXCLUDED.tipo_unid,
                  estoque_min=EXCLUDED.estoque_min,
                  estoque_atual=EXCLUDED.estoque_atual,
                  valor=EXCLUDED.valor,
                  fornecedor_id=EXCLUDED.fornecedor_id,
                  validade_negociacao=EXCLUDED.validade_negociacao,
                  tipo_fornecedor_id=EXCLUDED.tipo_fornecedor_id
              `,
              [
                item.codigo,
                item.descricao,
                item.tipo_unid,
                item.estoque_min === '' ? null : item.estoque_min,
                item.estoque_atual === '' ? null : item.estoque_atual,
                item.valor === '' ? null : parseFloat(item.valor.replace(',', '.')),
                item.fornecedor_id === '' ? null : item.fornecedor_id,
                item.validade_negociacao === '' ? null : item.validade_negociacao,
                tipo_fornecedor_id
              ]
            );
          } catch (err: any) {
            // Erro silencioso, pode ser tratado conforme necessidade futura
          }
        }
        res.json({ success: true, count: itens.length });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });
};

function parseDataBRtoISO(data: string) {
  if (!data || data === '') return null;
  const [dia, mes, ano] = data.split('/');
  if (!dia || !mes || !ano) return null;
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
} 