-- As funções de escrita transacional (aprovar_confirmacao, desafios_aceitar,
-- desafiado_encerrar_partida, adicionar_jogador_direto) rodam como
-- SECURITY INVOKER (padrão) e nunca tiveram o EXECUTE revogado de
-- anon/authenticated — auditoria confirmou que dá pra chamá-las direto via
-- supabase.rpc(...) com a anon key, pulando toda a autorização (capitão,
-- código de 4 dígitos, dono da sessão) que a rota /api faz em JS antes de
-- chamar. Hoje o dano é limitado porque as tabelas afetadas não têm policy
-- de insert/update pra esses papéis (a escrita falha ou é revertida
-- silenciosamente), mas isso é efeito colateral de outra proteção, não uma
-- garantia intencional dessa função. Revoga o EXECUTE explicitamente —
-- só o service_role (usado pelas rotas /api) continua podendo chamar.
revoke execute on function aprovar_confirmacao(uuid, bigint) from public, anon, authenticated;
revoke execute on function desafios_aceitar(uuid, uuid) from public, anon, authenticated;
revoke execute on function desafiado_encerrar_partida(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function adicionar_jogador_direto(uuid, uuid, text) from public, anon, authenticated;
