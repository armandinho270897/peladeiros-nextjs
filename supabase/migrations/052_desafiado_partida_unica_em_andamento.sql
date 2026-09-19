-- No máximo uma partida em andamento por sessão. Sem isso, um duplo clique
-- em "encerrar partida" podia criar duas próximas partidas e a tela ao vivo
-- ficava sem saber qual mostrar.
create unique index if not exists idx_desafiado_partidas_uma_em_andamento
  on desafiado_partidas(sessao_id) where status = 'em_andamento';
