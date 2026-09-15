-- Moderação de conta — estado simples de 4 valores. suspenso_ate marca o
-- prazo da suspensão (null = indefinido, único caso real é 'bloqueado');
-- moderacao_motivo guarda o motivo da ÚLTIMA ação (histórico completo de
-- todas as ações fica em admin_audit_log, migration 042 — aqui é só o
-- estado atual, pra checar rápido sem juntar com outra tabela).
alter table profiles add column if not exists status text not null default 'ativo';
alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check
  check (status in ('ativo', 'advertido', 'suspenso', 'bloqueado'));

alter table profiles add column if not exists suspenso_ate timestamptz;
alter table profiles add column if not exists moderacao_motivo text;
alter table profiles add column if not exists moderacao_atualizado_em timestamptz;

create index if not exists idx_profiles_status on profiles(status) where status <> 'ativo';
