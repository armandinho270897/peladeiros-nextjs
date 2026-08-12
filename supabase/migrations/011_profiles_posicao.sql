-- Posição do jogador (goleiro/zagueiro/meio/atacante/qualquer), opcional.
-- Usada no resumo de perfil na hora do capitão aprovar (item 5) e na
-- escalação visual da pelada (item 9) — sem isso os dois não têm dado
-- nenhum pra mostrar, então entra aqui mesmo antes de precisar dela.
alter table profiles add column if not exists posicao text;

alter table profiles drop constraint if exists profiles_posicao_check;
alter table profiles add constraint profiles_posicao_check
  check (posicao is null or posicao in ('goleiro', 'zagueiro', 'meio', 'atacante', 'qualquer'));
