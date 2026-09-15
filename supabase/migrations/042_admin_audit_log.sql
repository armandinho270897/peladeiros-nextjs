-- Registro imutável de toda ação administrativa — sem UPDATE/DELETE
-- previstos na aplicação (nenhuma rota edita ou apaga uma linha daqui).
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id),
  acao text not null,
  alvo_tipo text not null,
  alvo_id text,
  motivo text,
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_admin on admin_audit_log(admin_user_id);
create index if not exists idx_audit_alvo on admin_audit_log(alvo_tipo, alvo_id);
create index if not exists idx_audit_created on admin_audit_log(created_at desc);

alter table admin_audit_log enable row level security;
-- Sem policy — só a service role (rotas /api/admin/**) lê e escreve.
