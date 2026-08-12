-- Confirmação em duas etapas: depois que o capitão aprova, a vaga fica
-- reservada em 'aguardando_confirmacao' (ainda não é presença fechada) até
-- o jogador clicar "Confirmar minha vaga" ou o prazo (prazo_confirmacao)
-- vencer, liberando a vaga pro próximo do banco.
alter table confirmacoes add column if not exists prazo_confirmacao timestamptz;

alter table confirmacoes drop constraint if exists confirmacoes_status_check;
alter table confirmacoes add constraint confirmacoes_status_check
  check (status in ('pendente', 'aprovado', 'rejeitado', 'espera', 'aguardando_confirmacao'));
