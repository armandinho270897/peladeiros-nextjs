-- Encerramento formal da partida: o capitão marca quem compareceu depois
-- que a pelada já rolou. games.encerrada_em marca que já passou por esse
-- passo (libera avaliação); confirmacoes.presente registra o julgamento
-- por pessoa (null = pelada ainda não foi encerrada / sem julgamento).
alter table games add column if not exists encerrada_em timestamptz;
alter table confirmacoes add column if not exists presente boolean;
