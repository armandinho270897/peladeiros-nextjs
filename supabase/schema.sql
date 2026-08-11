-- Peladeiros — schema inicial (Fase 1)
-- Rode isso no SQL Editor do seu projeto Supabase (supabase.com -> New Project -> SQL Editor)

create extension if not exists "pgcrypto";

-- Tabela principal: peladas
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  local text not null,
  bairro text not null,
  data date not null,
  horario time not null,
  vagas_totais int not null check (vagas_totais > 0),
  capitao text not null,
  codigo text, -- PIN de 4 dígitos. Fallback pra peladas antigas sem owner_id (Fase 2 usa auth.uid()).
  owner_id uuid references auth.users(id),
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now()
);

-- Tabela de confirmações / fila de espera
create table if not exists confirmacoes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid references auth.users(id),
  nome text not null,
  whatsapp text not null,
  status text not null default 'confirmado' check (status in ('confirmado', 'espera')),
  created_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create index if not exists idx_confirmacoes_game_id on confirmacoes(game_id);
create index if not exists idx_games_data on games(data);
create index if not exists idx_games_bairro on games(bairro);

-- Tabela de arenas/quadras cadastradas (locais fixos, independente de pelada específica)
create table if not exists arenas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text not null,
  bairro text not null,
  tipo text not null default 'quadra',
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now()
);

alter table games add column if not exists arena_id uuid references arenas(id);

-- Perfis de usuário (Supabase Auth, magic link). Única tabela que aceita
-- escrita direto do navegador via RLS (auth.uid()), não só pela service role key.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  whatsapp text not null,
  bairro text,
  created_at timestamptz not null default now()
);

-- Avaliações pós-jogo entre jogadores confirmados na mesma pelada
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

-- Segurança: leitura pública liberada em games/confirmacoes/arenas/avaliacoes,
-- escrita SÓ pelas rotas /api (service role key, não a anon key). Em profiles,
-- a própria pessoa grava/edita seu perfil via RLS (auth.uid() = id).
alter table games enable row level security;
alter table confirmacoes enable row level security;
alter table arenas enable row level security;
alter table profiles enable row level security;
alter table avaliacoes enable row level security;

create policy "games são públicas para leitura" on games for select using (true);
create policy "confirmações são públicas para leitura" on confirmacoes for select using (true);
create policy "arenas são públicas para leitura" on arenas for select using (true);
create policy "perfis são públicos para leitura" on profiles for select using (true);
create policy "cada um só edita o próprio perfil" on profiles for update using (auth.uid() = id);
create policy "cada um só cria o próprio perfil" on profiles for insert with check (auth.uid() = id);
create policy "avaliações são públicas para leitura" on avaliacoes for select using (true);
