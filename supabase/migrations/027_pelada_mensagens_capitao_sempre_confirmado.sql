-- Bug reportado em produção: o capitão nunca tinha uma linha em
-- confirmacoes pra própria pelada (a criação da pelada nunca inseria essa
-- linha — corrigido agora em app/api/games/route.js), então a policy de
-- select em pelada_mensagens (025/026) simplesmente nunca deixava ele ler
-- o próprio chat, mesmo sendo o dono do jogo.
--
-- Além de corrigir o INSERT pra frente, adiciona aqui uma segunda condição
-- pro capitão sempre poder ler o chat, independente de existir ou não a
-- linha dele em confirmacoes — assim esse acesso não fica de novo refém de
-- um único INSERT nunca falhar (mesmo raciocínio aplicado em
-- lib/chatAuth.js e app/components/PeladaChat.js).
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
