-- Sistema de Times: grupos fixos de jogadores, base pro sistema de Match
-- (Fase B, próxima). Toda escrita passa pelas rotas /api (service role),
-- mesmo modelo de games/confirmacoes — só leitura é pública via RLS.
create table if not exists times (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  escudo_url text,
  bairro text,
  modalidade text,
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists time_membros (
  id uuid primary key default gen_random_uuid(),
  time_id uuid not null references times(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  papel text not null default 'membro' check (papel in ('capitao', 'membro')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  created_at timestamptz not null default now(),
  unique (time_id, user_id)
);

create index if not exists idx_time_membros_time_id on time_membros(time_id);
create index if not exists idx_time_membros_user_id on time_membros(user_id);

alter table times enable row level security;
alter table time_membros enable row level security;

create policy "times são públicos para leitura" on times for select using (true);
create policy "membros de time são públicos para leitura" on time_membros for select using (true);

-- Bucket do escudo do time. Diferente do bucket "avatars" (policy de escrita
-- por pasta-do-usuário via auth.uid()), aqui o upload acontece dentro da
-- rota /api/times (service role, que já ignora RLS de Storage) — na criação
-- do time o time_id (nome da pasta) só existe depois do insert, então não
-- dá pra usar a mesma policy "dono só escreve na própria pasta". Só precisa
-- de leitura pública; escrita nunca acontece pela anon key.
insert into storage.buckets (id, name, public)
values ('times-escudos', 'times-escudos', true)
on conflict (id) do nothing;

create policy "escudos de time são públicos pra leitura"
on storage.objects for select
using (bucket_id = 'times-escudos');
