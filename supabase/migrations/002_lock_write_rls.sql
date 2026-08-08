-- Peladeiros — trava escrita via anon key (Fase 1.5)
--
-- ⚠️ Só rode isso DEPOIS de confirmar que SUPABASE_SERVICE_ROLE_KEY está configurada
-- e funcionando (local .env.local + variáveis de ambiente na Vercel). A partir daqui,
-- a chave anônima (a que o navegador usa) deixa de conseguir inserir/editar/apagar
-- qualquer coisa — só as rotas /api (que agora usam a service role key, que ignora
-- RLS) continuam escrevendo. A validação do PIN de 4 dígitos continua sendo feita
-- no código dessas rotas, como já era.
--
-- Se rodar isso sem a service role key configurada, TODA escrita do app quebra
-- (criar pelada, confirmar presença, editar, cancelar).

drop policy if exists "qualquer um pode criar pelada (Fase 1)" on games;
drop policy if exists "qualquer um pode editar pelada (Fase 1 - validado no código pelo PIN)" on games;
drop policy if exists "qualquer um pode cancelar pelada (Fase 1 - validado no código pelo PIN)" on games;

drop policy if exists "qualquer um pode confirmar presença" on confirmacoes;
drop policy if exists "qualquer um pode remover confirmação (Fase 1 - validado no código pelo PIN)" on confirmacoes;
drop policy if exists "qualquer um pode atualizar confirmação (promoção de fila)" on confirmacoes;

-- As policies de leitura pública ("games são públicas para leitura" e
-- "confirmações são públicas para leitura") continuam valendo — não mexe nelas.
