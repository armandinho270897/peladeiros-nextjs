-- games não tinha nenhuma coluna de "estado" (o app sempre calculou tudo
-- em cima de data/horario/encerrada_em) — mas a área de Administração
-- precisa marcar uma pelada como pausada pela administração sem apagar
-- nada, então entra aqui uma coluna nullable a mais, no mesmo padrão já
-- usado por encerrada_em/cancelado_em (timestamp presente = estado ativo).
-- Cancelar continua sendo o DELETE que já existe (DELETE /api/games/[id],
-- reaproveitado por /api/admin/peladas/[id]/cancelar) — não precisa de
-- coluna nova pra isso.
alter table games add column if not exists pausada_em timestamptz;
alter table games add column if not exists pausada_motivo text;
