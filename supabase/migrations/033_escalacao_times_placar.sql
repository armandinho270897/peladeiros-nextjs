-- Divisão de times pra jogar (não confundir com a tabela `times` — clubes
-- permanentes já existentes) e o placar do confronto dentro de UMA pelada.
-- `time` fica em confirmacoes (cada jogador aprovado pode estar no time A,
-- B, ou sem time ainda — null é o estado antes do capitão montar os times).
-- Placar fica em games, preenchido junto do encerramento da partida.
alter table confirmacoes add column if not exists time text check (time in ('A', 'B'));
alter table games add column if not exists placar_time_a int check (placar_time_a >= 0);
alter table games add column if not exists placar_time_b int check (placar_time_b >= 0);
