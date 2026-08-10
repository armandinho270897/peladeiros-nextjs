-- Peladeiros — tabela de arenas/quadras cadastradas
-- Leitura pública liberada; escrita só via service role key (mesmo padrão das
-- outras tabelas — ver supabase/migrations/002_lock_write_rls.sql).

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

alter table arenas enable row level security;

create policy "arenas são públicas para leitura" on arenas for select using (true);
-- Sem policy de insert/update/delete: só a service role key (que ignora RLS)
-- consegue escrever, exatamente como já vale pra games e confirmacoes.
