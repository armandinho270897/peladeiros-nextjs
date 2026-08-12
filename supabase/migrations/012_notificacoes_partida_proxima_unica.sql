-- Evita duplicar a notificação de "partida próxima" quando a checagem (que
-- roda na abertura do app) é disparada mais de uma vez em paralelo — ex:
-- StrictMode do React em dev, ou duas abas abertas ao mesmo tempo. Índice
-- parcial (só pra esse tipo) pra não travar outros tipos que legitimamente
-- podem repetir pro mesmo par user/game (ex: aprovar depois de um rejeitar).
create unique index if not exists notificacoes_partida_proxima_unica
  on notificacoes (user_id, game_id)
  where tipo = 'partida_proxima';
