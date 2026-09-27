-- ACHADO DE SEGURANÇA (auditoria manual): profiles e confirmacoes têm
-- policy de select "using (true)" pensada pra dado público (nome, bairro,
-- jogo, status) — mas a coluna whatsapp (telefone real) ficou junto,
-- então qualquer um com a anon key (pública, já embutida no bundle do
-- app) lê o WhatsApp de todo mundo sem estar logado. Confirmado ao vivo:
-- select direto com a anon key, sem sessão, devolveu nome+whatsapp reais.
--
-- RLS é por linha, não por coluna — a correção certa aqui não é reescrever
-- a policy (ela está certa pras outras colunas), é revogar a coluna
-- especificamente dos papéis que o PostgREST usa pro cliente (anon = sem
-- sessão, authenticated = com sessão). Nenhuma tela do app lê whatsapp
-- pelo cliente: toda leitura passa por rota /api usando supabaseAdmin
-- (service_role), que não é afetado por isso — confirmado via grep, só
-- app/api/**/route.js seleciona a coluna, sempre com supabaseAdmin.
revoke select (whatsapp) on public.profiles from anon, authenticated;
revoke select (whatsapp) on public.confirmacoes from anon, authenticated;
