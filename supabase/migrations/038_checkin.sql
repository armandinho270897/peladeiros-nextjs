-- Check-in de jogo: sinal de presença que o próprio jogador registra ao
-- chegar na pelada. Distinto de confirmacoes.presente (migration 018), que
-- é o julgamento final do organizador no encerramento — checkin_at é só o
-- horário real de chegada, usado pro painel do organizador (quem já
-- chegou) e pra taxa de pontualidade no perfil (checkin_at != null é o
-- critério de "partida com check-in válido"). null = ainda não chegou ou
-- não aplicável (não fez check-in nessa pelada).
alter table confirmacoes add column if not exists checkin_at timestamptz;

-- Lembrete de check-in perto do horário (pra quem confirmou e ainda não
-- chegou) — mesmo padrão de dedup de partida_proxima_24h/3h (migration
-- 036): um aviso por pessoa por pelada, reaproveitado tanto pela checagem
-- reativa (abre o app) quanto pelo cron externo do GitHub Actions.
create unique index if not exists notificacoes_checkin_lembrete_unica
  on notificacoes (user_id, game_id)
  where tipo = 'checkin_lembrete';
