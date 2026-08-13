-- Peladeiros — avaliação expandida: além de jogador->jogador, agora dá pra
-- avaliar o capitão especificamente (tipo='capitao') e a partida como um
-- todo (tipo='geral', sem avaliado_id — não mira ninguém).

alter table avaliacoes alter column avaliado_id drop not null;

alter table avaliacoes add column if not exists tipo text not null default 'jogador'
  check (tipo in ('jogador', 'capitao', 'geral'));

-- a constraint original (game_id, avaliador_id, avaliado_id) não distingue
-- tipo — um jogador que avalia o capitão tanto na lista geral de jogadores
-- (tipo='jogador') quanto na seção específica (tipo='capitao') colidiria.
-- Troca pra incluir tipo.
alter table avaliacoes drop constraint if exists avaliacoes_game_id_avaliador_id_avaliado_id_key;
alter table avaliacoes add constraint avaliacoes_game_avaliador_avaliado_tipo_key
  unique (game_id, avaliador_id, avaliado_id, tipo);

-- tipo='geral' não tem avaliado_id (null), e null nunca colide com null
-- numa unique constraint normal — cobre com um índice parcial à parte.
create unique index if not exists avaliacoes_geral_unica
  on avaliacoes (game_id, avaliador_id)
  where tipo = 'geral';
