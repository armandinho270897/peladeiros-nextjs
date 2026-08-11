-- Peladeiros — avaliações pós-jogo entre jogadores confirmados
-- Escrita só via service role (rota /api valida as regras de negócio no código,
-- mesmo padrão de games/confirmacoes/arenas).

create table if not exists avaliacoes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  avaliador_id uuid not null references auth.users(id),
  avaliado_id uuid not null references auth.users(id),
  nota smallint not null check (nota between 1 and 5),
  tag text,
  created_at timestamptz not null default now(),
  unique (game_id, avaliador_id, avaliado_id)
);

alter table avaliacoes enable row level security;

create policy "avaliações são públicas para leitura" on avaliacoes for select using (true);
-- Sem policy de insert/update/delete: só a service role key escreve — a rota
-- /api valida que avaliador e avaliado confirmaram a mesma pelada já realizada
-- e que ninguém avalia a si mesmo antes de inserir.
