-- Lembrete pro organizador que esquece de encerrar a partida — mesmo
-- padrão da migration 036: um índice único parcial próprio pro tipo,
-- pra createNotification (lib/notify.js) ter garantia de banco contra
-- duplicata, não só a checagem em memória de notificarUmaVezPorTipo.
create unique index if not exists notificacoes_encerrar_partida_pendente_unica
  on notificacoes (user_id, game_id)
  where tipo = 'encerrar_partida_pendente';
