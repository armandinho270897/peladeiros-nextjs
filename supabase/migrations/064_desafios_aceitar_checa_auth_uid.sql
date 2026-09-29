-- Defesa em profundidade pra desafios_aceitar: ela confia em
-- p_aceitador_user_id sem checar quem está chamando de verdade. Hoje isso
-- só não é explorável porque o EXECUTE está revogado de anon/authenticated
-- (migration 060) — a rota /api sempre chama via service role, já com a
-- autorização (ser capitão do time desafiado) resolvida em JS antes. Mas
-- se um dia o EXECUTE for reconcedido, ou esse padrão for copiado numa
-- função nova, qualquer autenticado poderia chamar
-- desafios_aceitar(desafio_id, uuid_de_outra_pessoa) e criar a pelada +
-- confirmações em nome de outro usuário.
--
-- auth.uid() só reflete um usuário de verdade quando a chamada passa pelo
-- PostgREST com o JWT da pessoa (client anon/authenticated) — chamada via
-- service role (como a rota /api sempre faz) não carrega esse JWT, então
-- auth.uid() vem null aí. Por isso a checagem só entra em ação quando
-- existe mesmo um auth.uid() (ou seja, só no caminho que hoje está
-- bloqueado pelo REVOKE, e continuaria bloqueado mesmo se o REVOKE
-- falhasse) — nunca quebra a chamada legítima da rota.
create or replace function desafios_aceitar(p_desafio_id uuid, p_aceitador_user_id uuid)
returns table (
  game_id uuid,
  time_desafiante_id uuid,
  time_desafiado_id uuid,
  time_desafiante_nome text,
  time_desafiado_nome text,
  local text,
  data date,
  horario time
)
language plpgsql
as $$
declare
  v_desafio desafios%rowtype;
  v_profile_nome text;
  v_time_desafiante_nome text;
  v_time_desafiado_nome text;
  v_game_id uuid;
  v_vagas int;
begin
  if auth.uid() is not null and p_aceitador_user_id <> auth.uid() then
    raise exception 'Não autorizado.';
  end if;

  select * into v_desafio from desafios where id = p_desafio_id for update;
  if not found then
    raise exception 'Desafio não encontrado.';
  end if;
  if v_desafio.status <> 'pendente' then
    raise exception 'Esse desafio já foi respondido.';
  end if;
  if v_desafio.data is not null and v_desafio.horario is not null
     and (v_desafio.data::text || 'T' || v_desafio.horario::text || '-03:00')::timestamptz < now() then
    raise exception 'A data desse desafio já passou. Peça pro outro time propor uma nova.';
  end if;

  update desafios set status = 'aceito', respondido_em = now() where id = p_desafio_id;

  select nome into v_profile_nome from profiles where id = p_aceitador_user_id;
  select nome into v_time_desafiante_nome from times where id = v_desafio.time_desafiante_id;
  select nome into v_time_desafiado_nome from times where id = v_desafio.time_desafiado_id;

  select count(distinct user_id) into v_vagas from time_membros
    where time_id in (v_desafio.time_desafiante_id, v_desafio.time_desafiado_id) and status = 'aprovado';

  insert into games (local, bairro, data, horario, vagas_totais, capitao, owner_id, latitude, longitude, arena_id, tipo, nivel, valor, regras)
  values (
    v_desafio.local, v_desafio.bairro, v_desafio.data, v_desafio.horario,
    greatest(v_vagas, 2), coalesce(v_profile_nome, 'Capitão'), p_aceitador_user_id,
    v_desafio.latitude, v_desafio.longitude, v_desafio.arena_id, null, null, null,
    'Confronto: ' || coalesce(v_time_desafiante_nome, 'Time') || ' x ' || coalesce(v_time_desafiado_nome, 'Time')
  )
  returning id into v_game_id;

  insert into confirmacoes (game_id, user_id, nome, whatsapp, bairro, status)
  select v_game_id, p.id, p.nome, p.whatsapp, p.bairro, 'aprovado'
  from profiles p
  where p.id in (
    select distinct tm.user_id from time_membros tm
    where tm.time_id in (v_desafio.time_desafiante_id, v_desafio.time_desafiado_id) and tm.status = 'aprovado'
  );

  update desafios set game_id = v_game_id where id = p_desafio_id;

  return query select
    v_game_id, v_desafio.time_desafiante_id, v_desafio.time_desafiado_id,
    v_time_desafiante_nome, v_time_desafiado_nome, v_desafio.local, v_desafio.data, v_desafio.horario;
end;
$$;
