-- Desafios entre times — "Fase B" do sistema de Times, prevista desde
-- 024_times.sql. Tabela nova, sem alterar `games` — o vínculo final fica
-- em desafios.game_id (reverso), evitando colunas de time só usadas por
-- essa feature numa tabela genérica de pelada.

create table if not exists desafios (
  id uuid primary key default gen_random_uuid(),
  time_desafiante_id uuid not null references times(id) on delete cascade,
  time_desafiado_id uuid not null references times(id) on delete cascade,
  proposto_por uuid not null references auth.users(id),
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado', 'cancelado')),
  local text not null,
  bairro text not null,
  latitude numeric,
  longitude numeric,
  arena_id uuid references arenas(id) on delete set null,
  data date not null,
  horario time not null,
  mensagem text,
  game_id uuid references games(id) on delete set null,
  created_at timestamptz not null default now(),
  respondido_em timestamptz
);

create index if not exists idx_desafios_desafiado on desafios(time_desafiado_id);
create index if not exists idx_desafios_desafiante on desafios(time_desafiante_id);

alter table desafios enable row level security;

-- Mesmo padrão de times/time_membros: leitura pública, escrita só via
-- rota /api (service role).
create policy "desafios: leitura pública" on desafios for select using (true);
