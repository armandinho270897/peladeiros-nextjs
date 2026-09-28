-- A migration 057 tentou revogar só a COLUNA whatsapp (revoke select
-- (whatsapp) on ...) — testado ao vivo depois de aplicada: continuou
-- vazando. Confirmado por diagnóstico direto (information_schema): revoke
-- de coluna específica não "pega" nesse projeto (não identificamos a causa
-- exata — grant original pode ter sido feito de um jeito que o Postgres
-- não consegue subtrair uma coluna dele), mas revoke da tabela INTEIRA
-- funciona. Essa migration substitui a 057 com a abordagem que realmente
-- funciona: fecha a tabela toda pra anon/authenticated e abre só uma
-- VIEW pública que esconde o telefone de todo mundo, exceto o do próprio
-- dono vendo o próprio perfil (auth.uid() = id) — assim quem já usa
-- profile.whatsapp pra preencher o formulário de editar perfil continua
-- funcionando normalmente.
--
-- confirmacoes não precisa de view: nenhum componente cliente lê essa
-- tabela direto do navegador (confirmado por grep) — toda leitura já
-- passa por rota /api com supabaseAdmin, que ignora RLS/grants. Só
-- revoga a tabela inteira, sem substituto nenhum.
revoke select on public.confirmacoes from anon, authenticated;

revoke select on public.profiles from anon, authenticated;

-- Campos de moderação/preferência também não deveriam vazar pra qualquer
-- um vendo o perfil de outra pessoa — mascarados junto com o whatsapp.
-- Todo o resto (nome, bairro, foto, modalidade, posições, dados físicos)
-- já era pra ser público mesmo, sem mudança de comportamento aí.
-- SEM security_invoker: essa view precisa rodar com o privilégio de quem
-- criou ela (padrão do Postgres), não de quem consulta — se rodasse com o
-- privilégio de quem consulta, anon/authenticated cairiam de novo na
-- mesma barreira que acabamos de fechar na tabela base, e a view pararia
-- de funcionar pra eles.
create or replace view public.profiles_publico
as
select
  id, nome, bairro, created_at, idade, altura_cm, peso_kg, instagram,
  escolinhas, pe_dominante, disponibilidade, time_coracao, foto_url,
  modalidade_principal, posicoes,
  case when auth.uid() = id then whatsapp else null end as whatsapp,
  case when auth.uid() = id then notif_prefs else null end as notif_prefs,
  case when auth.uid() = id then role else null end as role,
  case when auth.uid() = id then status else null end as status,
  case when auth.uid() = id then suspenso_ate else null end as suspenso_ate,
  case when auth.uid() = id then moderacao_motivo else null end as moderacao_motivo,
  case when auth.uid() = id then moderacao_atualizado_em else null end as moderacao_atualizado_em
from public.profiles;

grant select on public.profiles_publico to anon, authenticated;

-- IMPORTANTE pra quem mexer no schema depois: essa view lista as colunas
-- de profiles à mão (Postgres não tem "select * except coluna"). Uma
-- coluna nova em profiles NÃO aparece aqui sozinha — se for um dado
-- público, adiciona na lista de cima; se for sensível (tipo whatsapp),
-- adiciona mascarada com o mesmo "case when auth.uid() = id" dos outros.
