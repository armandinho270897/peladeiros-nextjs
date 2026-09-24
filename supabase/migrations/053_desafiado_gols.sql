-- Um gol marcado por um jogador específico, numa partida específica.
-- desafiado_partidas.gols_time_a/gols_time_b continua sendo a fonte de
-- verdade do placar e de quem venceu a partida — essa tabela é auxiliar,
-- só pra computar o artilheiro da sessão e permitir desfazer o gol certo
-- (o último daquele time) em vez de só decrementar um número.
-- sessao_id é redundante com partida_id -> desafiado_partidas.sessao_id,
-- mas evita um join só pra somar gol por jogador na sessão inteira.
create table if not exists desafiado_gols (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references desafiado_sessoes(id) on delete cascade,
  partida_id uuid not null references desafiado_partidas(id) on delete cascade,
  time_id uuid not null references desafiado_times(id) on delete cascade,
  jogador_id uuid not null references desafiado_jogadores(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_desafiado_gols_sessao on desafiado_gols(sessao_id);
create index if not exists idx_desafiado_gols_partida_time on desafiado_gols(partida_id, time_id);

alter table desafiado_gols enable row level security;
-- Mesmo padrão das outras tabelas do Desafiado: sem policy pra
-- anon/authenticated, leitura e escrita só pelas rotas /api/desafiado/**
-- via supabaseAdmin.
