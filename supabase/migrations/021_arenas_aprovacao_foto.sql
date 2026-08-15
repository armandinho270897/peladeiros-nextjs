-- Fila de aprovação de arena + foto do local.
-- Arenas cadastradas antes desta feature já estavam públicas no mapa —
-- ficam 'aprovada' automaticamente (default), sem reabrir aprovação
-- retroativa pra elas. Só arenas novas, criadas pelo formulário público,
-- entram como 'pendente' (a API já força isso no insert).
alter table arenas add column if not exists status text not null default 'aprovada';
alter table arenas drop constraint if exists arenas_status_check;
alter table arenas add constraint arenas_status_check
  check (status in ('pendente', 'aprovada', 'rejeitada'));

alter table arenas add column if not exists foto_url text;

-- Quem propôs a arena — cadastrar arena hoje já exige sessão ativa
-- (rota fica atrás do middleware de auth), então dá pra referenciar
-- direto o usuário logado. Arenas antigas (antes desta coluna existir)
-- ficam com proponente nulo — não tem como saber quem cadastrou.
alter table arenas add column if not exists proposto_por_user_id uuid references auth.users(id);

-- Bucket de fotos de arena — leitura pública (foto do local não é
-- sensível), escrita restrita a quem está logado, na própria pasta
-- (mesmo padrão "owner-only write" já usado no bucket "avatars").
insert into storage.buckets (id, name, public)
values ('arena-fotos', 'arena-fotos', true)
on conflict (id) do nothing;

create policy "fotos de arena são públicas pra leitura"
on storage.objects for select
using (bucket_id = 'arena-fotos');

create policy "usuário logado escreve em arena-fotos na própria pasta"
on storage.objects for insert
with check (bucket_id = 'arena-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
