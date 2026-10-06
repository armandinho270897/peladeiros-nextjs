-- Escolha do capitão: o cartão (Ficha do Time) usa a cor primária do
-- uniforme no brilho/borda, ou fica neon como o resto do app. Padrão false =
-- todo time existente continua neon até o capitão ligar.
alter table times
  add column if not exists ficha_cor_do_time boolean not null default false;
