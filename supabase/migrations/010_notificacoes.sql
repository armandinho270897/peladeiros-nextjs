-- Central de notificações in-app (sem push, sem e-mail). Escrita só via
-- service role (rotas /api criam a notificação no momento certo); leitura
-- e "marcar como lida" acontecem direto do navegador via RLS, mesmo padrão
-- já usado em profiles pra dados que só o dono mexe.
create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  game_id uuid references games(id) on delete cascade,
  lida boolean not null default false,
  mensagem text not null,
  created_at timestamptz not null default now()
);

alter table notificacoes enable row level security;

create policy "cada um vê só as próprias notificações" on notificacoes for select using (auth.uid() = user_id);
create policy "cada um marca só as próprias notificações como lidas" on notificacoes for update using (auth.uid() = user_id);
