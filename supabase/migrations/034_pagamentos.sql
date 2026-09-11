-- Dois sistemas de cobrança, porque são domínios diferentes:
-- (1) Mensalidade — valor fixo mensal do TIME (times.mensalidade_valor),
-- cobrado de quem é mensalista (time_membros.mensalista) independente de
-- quantas peladas jogou. Presença de uma linha em `mensalidades` pro
-- mês = pago; ausência = pendente (sem precisar de job pra "resetar" o mês
-- toda vez — o mês novo já nasce todo pendente por padrão, é só não ter
-- linha ainda).
-- (2) Pagamento avulso — valor da PELADA (games.valor, já existe), cobrado
-- de quem confirmou presença naquela pelada específica. Um boolean simples
-- em cima de confirmacoes, mesmo padrão de `presente`.
alter table times add column if not exists mensalidade_valor numeric;

create table if not exists mensalidades (
  id uuid primary key default gen_random_uuid(),
  time_membro_id uuid not null references time_membros(id) on delete cascade,
  mes_referencia date not null,
  valor numeric not null,
  pago_em timestamptz not null default now(),
  registrado_por uuid references auth.users(id),
  unique (time_membro_id, mes_referencia)
);
alter table mensalidades enable row level security;

alter table confirmacoes add column if not exists pago boolean not null default false;
