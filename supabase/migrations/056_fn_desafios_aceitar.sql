-- Aceitar um desafio entre times cria a pelada (games), confirma todo
-- mundo aprovado dos dois elencos (confirmacoes) e marca o desafio como
-- aceito — três escritas que ou acontecem juntas, ou nenhuma acontece.
-- Antes disso tinha um "desfazer()" manual em JS pra cada ponto de falha
-- possível (bom o suficiente, mas frágil: um novo passo adicionado depois
-- fácil esquece de tratar o próprio rollback). Numa função só, o Postgres
-- desfaz tudo sozinho se qualquer parte falhar.
--
-- "for update" no desafio serializa aceitar concorrente do MESMO desafio
-- (dois cliques, ou os dois capitães do time desafiado ao mesmo tempo).
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
