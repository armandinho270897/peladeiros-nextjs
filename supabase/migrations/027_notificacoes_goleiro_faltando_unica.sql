-- Mesmo motivo da migration 012, agora pro aviso de goleiro faltando: a
-- checagem roda na abertura do app (verificar-goleiro) e pode disparar mais
-- de uma vez em paralelo (StrictMode, duas abas), então sem esse índice
-- parcial o padrão "seleciona já notificados, insere, tolera 23505" que a
-- rota usa não é de fato à prova de corrida — duas chamadas concorrentes
-- podiam passar pela checagem e inserir duas notificações duplicadas.
create unique index if not exists notificacoes_goleiro_faltando_unica
  on notificacoes (user_id, game_id)
  where tipo = 'goleiro_faltando';
