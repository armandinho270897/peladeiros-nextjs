-- BUG CRÍTICO EM PRODUÇÃO: a migration 061 revogou SELECT em `confirmacoes`
-- de anon/authenticated (correta pro vazamento de whatsapp), mas a policy
-- de leitura de pelada_mensagens (028) referencia `confirmacoes` numa
-- subquery dentro de um OR — e o Postgres exige privilégio SELECT na tabela
-- referenciada mesmo no ramo que não seria necessário pro capitão. Resultado
-- confirmado ao vivo: TODO MUNDO (capitão incluso) recebe
-- "permission denied for table confirmacoes" ao tentar ler o chat de
-- qualquer pelada, desde que a 061 foi aplicada.
--
-- Corrige com uma função SECURITY DEFINER: ela roda com o privilégio de quem
-- a criou (dono/postgres), não do usuário que está consultando, então
-- consegue ler `games`/`confirmacoes` mesmo com authenticated sem GRANT
-- nelas — mesmo raciocínio já usado em profiles_publico (061), só que como
-- função em vez de view porque aqui precisamos parametrizar por game_id.
create or replace function public.pode_ler_chat_pelada(p_game_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from games g
    where g.id = p_game_id
      and now() < ((g.data + g.horario) at time zone 'America/Sao_Paulo')
      and (
        g.owner_id = p_user_id
        or exists (
          select 1
          from confirmacoes c
          where c.game_id = g.id
            and c.user_id = p_user_id
            and c.status = 'aprovado'
        )
      )
  );
$$;

revoke all on function public.pode_ler_chat_pelada(uuid, uuid) from public;
grant execute on function public.pode_ler_chat_pelada(uuid, uuid) to anon, authenticated;

drop policy if exists "ler mensagens só quem confirmou presença enquanto a pelada não aconteceu" on pelada_mensagens;

create policy "ler mensagens só quem confirmou presença enquanto a pelada não aconteceu"
  on pelada_mensagens for select
  using ( public.pode_ler_chat_pelada(pelada_mensagens.game_id, auth.uid()) );
