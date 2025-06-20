INSERT INTO categorias (id, descricao) VALUES
(1, 'Limpeza Química'),
(2, 'Higiene e Descarte'),
(3, 'Copa/Cozinha'),
(4, 'Utensílios de Limpeza'),
(5, 'EPI'),
(6, 'Material de Escritório'),
(7, 'Manutencao/Outros'),
(8, 'Farmacia/Primeiros Socorros'),
(9, 'Outros')
ON CONFLICT (id) DO NOTHING;

-- Reinicia a sequência para o próximo valor disponível, evitando conflitos de ID.
SELECT setval('categorias_id_seq', (SELECT MAX(id) FROM categorias)); 