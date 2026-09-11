-- Fair play como dimensão própria da avaliação (separada da nota de
-- desempenho) — null quando quem avaliou nem tocou no campo (avaliação
-- 'geral', que não mira uma pessoa), true/false quando avaliou alguém.
alter table avaliacoes add column if not exists fair_play boolean;
