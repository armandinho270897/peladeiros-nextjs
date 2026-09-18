-- Times de uma sessão de Desafiado. posicao_fila 0 e 1 são quem tá jogando
-- agora; 2+ é a ordem de espera (menor = mais perto de entrar em quadra).
create table if not exists desafiado_times (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references desafiado_sessoes(id) on delete cascade,
  numero int not null,
  posicao_fila int not null,
  vitorias int not null default 0,
  derrotas int not null default 0,
  gols_marcados int not null default 0,
  gols_sofridos int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_desafiado_times_sessao on desafiado_times(sessao_id);
create index if not exists idx_desafiado_times_fila on desafiado_times(sessao_id, posicao_fila);

alter table desafiado_times enable row level security;
