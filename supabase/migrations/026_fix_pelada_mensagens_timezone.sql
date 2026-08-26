-- 025 comparava now() (timestamptz, UTC) direto com g.data + g.horario (um
-- timestamp "sem fuso"), que o Postgres então cast pro fuso da SESSÃO —
-- UTC por padrão no Supabase. Como os jogos são sempre marcados no horário
-- de Brasília, isso fechava o chat 3h antes da hora real (17h fechava um
-- jogo marcado pras 20h). Corrige fixando o fuso de Brasília na comparação
-- (Brasil não usa mais horário de verão, -03:00 vale o ano todo — mesmo
-- ajuste feito no lado JS em lib/gameUtils.js).
drop policy if exists "ler mensagens só quem confirmou presença enquanto a pelada não aconteceu" on pelada_mensagens;

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
        and now() < ((g.data + g.horario) at time zone 'America/Sao_Paulo')
    )
  );
