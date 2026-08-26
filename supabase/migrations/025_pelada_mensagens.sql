-- Chat de texto por pelada: um chat por jogo, só entre quem confirmou
-- presença NESSE jogo específico (status 'aprovado' em confirmacoes — não
-- tem exceção pro capitão, se ele não confirmou nele mesmo também não vê).
-- Escrita passa pela rota /api (service role), mesmo modelo de
-- games/confirmacoes/times — RLS aqui é só leitura, mas essa leitura
-- também é o que filtra quem recebe cada evento via Realtime.
--
-- "Fechar" o chat depois do horário da pelada não apaga nada: a policy de
-- select simplesmente para de valer, então fica invisível sem precisar de
-- job de limpeza. Decisão de apagar mensagens antigas de vez fica pra
-- depois, se algum dia precisar economizar espaço.
create table if not exists pelada_mensagens (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  texto text not null check (char_length(texto) between 1 and 500),
  criado_em timestamptz not null default now()
);

create index if not exists idx_pelada_mensagens_game_id on pelada_mensagens(game_id, criado_em);

alter table pelada_mensagens enable row level security;

create policy "ler mensagens só quem confirmou presença enquanto a pelada não aconteceu"
  on pelada_mensagens for select
  using (
    exists (
      select 1
      from confirmacoes c
      join games g on g.id = c.game_id
      where c.game_id = pelada_mensagens.game_id
        and c.user_id = auth.uid()
        and c.status = 'aprovado'
        and now() < (g.data + g.horario)
    )
  );

alter publication supabase_realtime add table pelada_mensagens;
