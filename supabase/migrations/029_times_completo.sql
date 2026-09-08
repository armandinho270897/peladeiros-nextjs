-- Reformulação de Times: estende times/time_membros em vez de recriar do
-- zero (aditivo, sem quebrar dado existente). Ver plano "Times — Passo 1".

alter table times
  add column if not exists sigla text,
  add column if not exists tecnico text,
  add column if not exists arena_id uuid references arenas(id) on delete set null,
  add column if not exists dia_jogo text,
  add column if not exists horario_jogo text,
  add column if not exists max_jogadores int not null default 15,
  add column if not exists recrutamento text not null default 'fechado'
    check (recrutamento in ('fechado', 'procurando_jogadores', 'procurando_goleiro')),
  add column if not exists privado boolean not null default false;

create index if not exists idx_times_arena_id on times(arena_id);

-- papel ganha 'vice_capitao' — recria o check em vez de ALTER, é o único
-- jeito de mudar a lista de valores de um CHECK já existente no Postgres.
alter table time_membros drop constraint if exists time_membros_papel_check;
alter table time_membros
  add constraint time_membros_papel_check check (papel in ('capitao', 'vice_capitao', 'membro'));

alter table time_membros
  add column if not exists posicao text,
  add column if not exists numero_camisa int,
  add column if not exists mensalista boolean not null default true,
  add column if not exists nome_convidado text;

-- Convidado sem conta: mesmo padrão de confirmacoes.user_id (nullable) +
-- nome direto. A unique(time_id, user_id) existente já convive bem com
-- múltiplos user_id NULL (Postgres nunca trata NULL como igual a NULL numa
-- unique constraint), então nenhum convidado colide com outro.
alter table time_membros alter column user_id drop not null;
