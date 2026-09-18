-- Jogador presente numa sessão de Desafiado — pode não ter conta, mesmo
-- padrão já usado em confirmacoes (user_id nullable, nome texto livre sem
-- FK). time_id nulo = ainda na lista de espera, aguardando fechar um time
-- novo (ver POST /api/desafiado/[id]/jogadores).
create table if not exists desafiado_jogadores (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references desafiado_sessoes(id) on delete cascade,
  user_id uuid references auth.users(id),
  nome text not null,
  time_id uuid references desafiado_times(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_desafiado_jogadores_sessao on desafiado_jogadores(sessao_id);
create index if not exists idx_desafiado_jogadores_time on desafiado_jogadores(time_id);

-- Quem tem conta não pode entrar duas vezes na mesma sessão. Parcial (só
-- quando user_id não é nulo) porque convidados sem conta não têm
-- identidade nenhuma pra deduplicar — nada impede dois convidados com o
-- mesmo nome, e não faz sentido tentar.
create unique index if not exists idx_desafiado_jogadores_sessao_user_unico
  on desafiado_jogadores(sessao_id, user_id) where user_id is not null;

alter table desafiado_jogadores enable row level security;
