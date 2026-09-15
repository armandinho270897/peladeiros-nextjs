-- Avisos administrados pelo dono do app pra todo mundo (ou um grupo), bem
-- diferentes das notificações pessoais (lib/notify.js): em vez de inserir
-- uma linha por usuário-alvo (não escala pra milhares de contas), fica UMA
-- linha aqui e o cliente busca os avisos ativos pro próprio público-alvo.
-- publico_alvo é string simples de propósito ('todos' | 'organizadores' |
-- 'bairro:<nome>') — não é um sistema de segmentação novo, só o suficiente
-- pro pedido original.
create table if not exists avisos_admin (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensagem text not null,
  publico_alvo text not null default 'todos',
  inicio_em timestamptz not null default now(),
  fim_em timestamptz,
  publicado boolean not null default false,
  criado_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_avisos_publicados on avisos_admin(publicado, inicio_em, fim_em);

alter table avisos_admin enable row level security;
create policy "avisos publicados dentro da janela são públicos pra leitura"
on avisos_admin for select
using (publicado = true and inicio_em <= now() and (fim_em is null or fim_em >= now()));
-- Sem policy de insert/update pra anon/authenticated — só /api/admin/avisos
-- (service role + authorizeAdmin()) escreve.
