-- Bug reportado em produção: o capitão nem sempre tem uma linha em
-- confirmacoes pra própria pelada (peladas antigas, ou um insert que
-- falhou na criação), então a policy de select em pelada_mensagens (025/026)
-- simplesmente não deixava ele ler o próprio chat, mesmo sendo o dono do
-- jogo.
--
-- Adiciona uma segunda condição pro capitão sempre poder ler o chat,
-- independente de existir ou não a linha dele em confirmacoes — assim esse
-- acesso não fica refém de um único INSERT nunca falhar (mesmo raciocínio
-- aplicado em lib/chatAuth.js e lib/gameUtils.js:souCapitaoDe).
drop policy if exists "ler mensagens só quem confirmou presença enquanto a pelada não aconteceu" on pelada_mensagens;

create policy "ler mensagens só quem confirmou presença enquanto a pelada não aconteceu"
  on pelada_mensagens for select
  using (
    exists (
      select 1
      from games g
      where g.id = pelada_mensagens.game_id
        and now() < ((g.data + g.horario) at time zone 'America/Sao_Paulo')
        and (
          g.owner_id = auth.uid()
          or exists (
            select 1
            from confirmacoes c
            where c.game_id = g.id
              and c.user_id = auth.uid()
              and c.status = 'aprovado'
          )
        )
    )
  );
