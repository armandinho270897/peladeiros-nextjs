-- Peladeiros — identidade real (Supabase Auth) substituindo o PIN
-- Peladas/confirmações antigas continuam com owner_id/user_id nulos e
-- seguem funcionando pelo fluxo de PIN de sempre (fallback intencional).

alter table games add column if not exists owner_id uuid references auth.users(id);
alter table games alter column codigo drop not null;

alter table confirmacoes add column if not exists user_id uuid references auth.users(id);
alter table confirmacoes add constraint confirmacoes_game_user_unique unique (game_id, user_id);
