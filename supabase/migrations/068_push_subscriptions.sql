-- Notificação push de verdade (chega mesmo com o app fechado) — cada linha
-- é uma "assinatura" de um navegador/aparelho específico pra um usuário.
-- Uma pessoa pode ter várias (celular + computador, por exemplo).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;
-- Sem policy nenhuma — mesmo padrão de escrita sensível do resto do app:
-- só a rota /api (service role) grava/lê/apaga, nunca direto do navegador.
