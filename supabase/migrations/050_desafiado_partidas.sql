-- Uma partida dentro da sessão. time_a/time_b são quem estava nas posições
-- 0 e 1 da fila no momento em que a partida foi criada. criterio_desempate
-- só é preenchido se o placar empatou quando o tempo acabou.
create table if not exists desafiado_partidas (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references desafiado_sessoes(id) on delete cascade,
  time_a_id uuid not null references desafiado_times(id),
  time_b_id uuid not null references desafiado_times(id),
  gols_time_a int not null default 0,
  gols_time_b int not null default 0,
  iniciada_em timestamptz not null default now(),
  duracao_min int not null,
  status text not null default 'em_andamento' check (status in ('em_andamento', 'encerrada')),
  criterio_desempate text check (criterio_desempate in ('prorrogacao', 'penaltis', 'cara_coroa')),
  vencedor_time_id uuid references desafiado_times(id),
  encerrada_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_desafiado_partidas_sessao on desafiado_partidas(sessao_id);
create index if not exists idx_desafiado_partidas_status on desafiado_partidas(sessao_id, status);

alter table desafiado_partidas enable row level security;
