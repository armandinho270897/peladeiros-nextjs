-- Peladeiros — perfis de usuário (Supabase Auth, magic link)
-- Primeira tabela que aceita escrita direto do navegador (via RLS), não só
-- pela service role key: faz sentido o próprio usuário gravar seu perfil.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  whatsapp text not null,
  bairro text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "perfis são públicos para leitura" on profiles for select using (true);
create policy "cada um só edita o próprio perfil" on profiles for update using (auth.uid() = id);
create policy "cada um só cria o próprio perfil" on profiles for insert with check (auth.uid() = id);
