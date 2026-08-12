-- Perfil mais completo (itens simples, todos opcionais) + preferências de
-- notificação por tipo (chave ausente = habilitado, tudo ligado por padrão).
alter table profiles add column if not exists idade int;
alter table profiles add column if not exists altura_cm int;
alter table profiles add column if not exists peso_kg numeric;
alter table profiles add column if not exists instagram text;
alter table profiles add column if not exists escolinhas text;
alter table profiles add column if not exists notif_prefs jsonb not null default '{}'::jsonb;
