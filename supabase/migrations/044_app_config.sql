-- Configurações globais, chave/valor. Nesta primeira versão são só pra
-- consulta/registro do valor operacional atual na tela de Configurações —
-- a tolerância de check-in (lib/gameUtils.js, CHECKIN_TOLERANCIA_MS) e o
-- limite de cancelamento (LIMITE_EM_CIMA_DA_HORA_MS) continuam hardcoded no
-- código, que é usado em contexto síncrono client+server; rewire completo
-- pra ler daqui em tempo real fica pra depois, pra não arriscar as regras
-- de confirmação/check-in já testadas em produção sem necessidade.
create table if not exists app_config (
  chave text primary key,
  valor jsonb not null,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);

insert into app_config (chave, valor) values
  ('tolerancia_checkin_min', '10'),
  ('limite_cancelamento_horas', '3')
on conflict (chave) do nothing;

alter table app_config enable row level security;
-- Sem policy — só a service role (rotas /api/admin/**) lê e escreve.
