-- "Agenda da Pelada" divide o antigo aviso único "partida_proxima" em dois
-- lembretes independentes (24h antes via cron, 3h antes reativo — ver
-- lib/lembretesPartida.js). O índice parcial antigo (migration 012) só
-- cobre tipo='partida_proxima' — sem um índice próprio pra cada tipo novo,
-- a checagem de "já mandei esse aviso" (lib/notify.js, tolera 23505 como
-- corrida benigna) perde a garantia de banco contra corrida entre a
-- checagem reativa (abre o app) e o cron (roda 1x/dia), podendo duplicar
-- notificação e e-mail.
create unique index if not exists notificacoes_partida_proxima_24h_unica
  on notificacoes (user_id, game_id)
  where tipo = 'partida_proxima_24h';

create unique index if not exists notificacoes_partida_proxima_3h_unica
  on notificacoes (user_id, game_id)
  where tipo = 'partida_proxima_3h';
