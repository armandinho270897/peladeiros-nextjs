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
  codigo text not null, -- PIN de 4 dígitos (Fase 1). Será substituído por auth.uid() na Fase 2, sem quebrar o resto do schema.
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now()
);

-- Tabela de confirmações / fila de espera
-- Separada de "games" de propósito: no futuro, troca fácil pra referenciar profiles(id) em vez de nome/whatsapp soltos.
create table if not exists confirmacoes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  nome text not null,
  whatsapp text not null,
  status text not null default 'confirmado' check (status in ('confirmado', 'espera')),
  created_at timestamptz not null default now()
);

create index if not exists idx_confirmacoes_game_id on confirmacoes(game_id);
create index if not exists idx_games_data on games(data);
create index if not exists idx_games_bairro on games(bairro);

-- Segurança (Fase 1.5): leitura pública liberada, escrita SÓ pelas rotas /api
-- (que usam a service role key, não a anon key, e validam o PIN de 4 dígitos no código).
-- A anon key (a que o navegador usa) não tem permissão de insert/update/delete no banco.
-- Quando entrar auth de verdade (Fase 2), isso muda pra políticas que checam auth.uid().
alter table games enable row level security;
alter table confirmacoes enable row level security;

create policy "games são públicas para leitura" on games for select using (true);
create policy "confirmações são públicas para leitura" on confirmacoes for select using (true);

-- ⚠️ Nota de segurança honesta: como ainda não existe login (Fase 1), a validação do
-- código de 4 dígitos acontece no backend (nas rotas /api), não no banco. Isso é aceitável
-- pra validação com um grupo pequeno, mas antes de crescer, a Fase 2 troca isso por
-- Supabase Auth + políticas RLS que checam auth.uid() de verdade.
