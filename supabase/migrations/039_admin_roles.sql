-- Papel de administração — só dois valores bastam pro escopo de moderação
-- da plataforma (não é um sistema de permissões granular, é liga/desliga
-- poder administrativo global).
alter table profiles add column if not exists role text not null default 'user';
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('user', 'admin'));

-- Bootstrap: o UUID já usado como "dono do app" pra aprovação de arena
-- (lib/adminConfig.js, ADMIN_USER_ID) vira o primeiro admin de verdade.
update profiles set role = 'admin' where id = '4d0e403c-e09d-4e53-a180-228ba85a6455';

-- Anti-auto-promoção: nenhuma sessão autenticada normal (mesmo de um admin
-- de verdade, tentando editar o próprio perfil ou o de outra pessoa) muda a
-- coluna role — só uma escrita via service-role key passa (auth.uid() fica
-- nulo nesse contexto, sem JWT). A única rota que muda role
-- (POST /api/admin/usuarios/[id]/papel) usa a service role E ainda exige
-- ser especificamente o ADMIN_USER_ID fixo pra chamar — duas camadas, não
-- uma só. Isso vai além do RLS de UPDATE já existente (auth.uid() = id,
-- migration 006), que continua deixando qualquer um editar nome/bairro/etc.
create or replace function trg_block_self_role_change()
returns trigger as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'role só pode ser alterado pela administração da plataforma';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists block_self_role_change on profiles;
create trigger block_self_role_change
  before update on profiles
  for each row execute function trg_block_self_role_change();

-- Arenas ganham um 4º status pro admin poder pausar um local sem rejeitar
-- (perde a aprovação anterior sem apagar o cadastro nem exigir reenvio).
alter table arenas drop constraint if exists arenas_status_check;
alter table arenas add constraint arenas_status_check
  check (status in ('pendente', 'aprovada', 'rejeitada', 'pausada'));
