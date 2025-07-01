-- V15: Cria a tabela para registrar logs de auditoria gerais do sistema.

CREATE TABLE public.log_auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES public.usuario(id),
    acao VARCHAR(100) NOT NULL,
    tabela_afetada VARCHAR(100),
    registro_afetado_id INTEGER,
    detalhes TEXT,
    data_ocorrencia TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.log_auditoria IS 'Registra todas as ações importantes realizadas pelos usuários no sistema para fins de auditoria.';
COMMENT ON COLUMN public.log_auditoria.acao IS 'A ação realizada (ex: CRIACAO, ATUALIZACAO, EXCLUSAO, LOGIN).';
COMMENT ON COLUMN public.log_auditoria.tabela_afetada IS 'A tabela que sofreu a ação.';
COMMENT ON COLUMN public.log_auditoria.registro_afetado_id IS 'O ID do registro que foi afetado pela ação.'; 