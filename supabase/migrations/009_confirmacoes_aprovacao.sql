-- Fluxo de aprovação: toda confirmação nasce pendente e só conta vaga
-- depois que o capitão aprova. 'confirmado' vira 'aprovado' (mesmo
-- significado de sempre, nome mais claro agora que existe um pendente).
update confirmacoes set status = 'aprovado' where status = 'confirmado';

alter table confirmacoes add column if not exists bairro text;

alter table confirmacoes drop constraint if exists confirmacoes_status_check;
alter table confirmacoes add constraint confirmacoes_status_check
  check (status in ('pendente', 'aprovado', 'rejeitado', 'espera'));
