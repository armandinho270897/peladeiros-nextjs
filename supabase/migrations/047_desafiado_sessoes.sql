-- Sessão de "Desafiado" — rachão com fila giratória, criado a partir do
-- botão na Início pra jogo NA HORA (não agendado, isso continua sendo o
-- fluxo normal de criar pelada). Sistema paralelo ao de pelada de
-- verdade: não conta pra moral/presença/histórico, existe só enquanto o
-- jogo rola e é apagado depois de alguns dias (varredura no cron diário,
-- ver app/api/cron/lembretes/route.js).
create table if not exists desafiado_sessoes (
  id uuid primary key default gen_random_uuid(),
  criado_por uuid not null references auth.users(id),
  local text not null,
  bairro text not null,
  latitude numeric,
  longitude numeric,
  arena_id uuid references arenas(id) on delete set null,
  tipo_jogo text not null,
  tamanho_time int not null check (tamanho_time > 0),
  duracao_partida_min int not null check (duracao_partida_min > 0),
  status text not null default 'ativa' check (status in ('ativa', 'encerrada')),
  created_at timestamptz not null default now(),
  encerrada_em timestamptz
);

create index if not exists idx_desafiado_sessoes_status on desafiado_sessoes(status);
create index if not exists idx_desafiado_sessoes_created on desafiado_sessoes(created_at);

alter table desafiado_sessoes enable row level security;
-- Sem policy — só as rotas /api/desafiado/** (service role) leem/escrevem.
