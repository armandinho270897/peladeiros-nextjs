-- Perfil mais completo: pé dominante, disponibilidade (texto livre) e time
-- do coração, todos opcionais — mais o bucket de storage pra foto de perfil.
alter table profiles add column if not exists pe_dominante text;
alter table profiles add column if not exists disponibilidade text;
alter table profiles add column if not exists time_coracao text;
alter table profiles add column if not exists foto_url text;

-- Bucket público pra leitura (fotos de perfil não são sensíveis), escrita
-- restrita ao dono do arquivo (mesmo padrão de "owner-only write" já usado
-- nas tabelas). Nome do arquivo tem que começar com o user id (ex:
-- "<user_id>/avatar.jpg") pra política de escrita funcionar.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatares são públicos pra leitura"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "usuário só escreve no próprio avatar"
on storage.objects for insert
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "usuário só atualiza o próprio avatar"
on storage.objects for update
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "usuário só apaga o próprio avatar"
on storage.objects for delete
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
