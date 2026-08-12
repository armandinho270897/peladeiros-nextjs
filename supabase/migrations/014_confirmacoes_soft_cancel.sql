-- Cancelar presença deixa de apagar a linha (hard delete) e passa a marcar
-- status 'cancelado' + cancelado_em — sem isso não dá pra saber depois se
-- alguém cancelou em cima da hora (selo do capitão e Moral dependem disso).
alter table confirmacoes add column if not exists cancelado_em timestamptz;

alter table confirmacoes drop constraint if exists confirmacoes_status_check;
alter table confirmacoes add constraint confirmacoes_status_check
  check (status in ('pendente', 'aprovado', 'rejeitado', 'espera', 'aguardando_confirmacao', 'cancelado'));
