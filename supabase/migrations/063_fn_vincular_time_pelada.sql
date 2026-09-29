-- Mesma corrida que 054/058 já corrigiram em aprovar_confirmacao e
-- adicionar_jogador_direto: vincular um time buscava vagas ocupadas e
-- decidia aprovado/espera pra cada membro num loop em JS, sem nenhuma
-- trava. Duas chamadas concorrentes de vincular-time (ou uma concorrente
-- com aprovar/adicionar-jogador/confirmar no MESMO jogo) podiam contar a
-- mesma vaga livre mais de uma vez e estourar vagas_totais.
--
-- "for update" na linha do jogo serializa contra QUALQUER uma dessas outras
-- operações no mesmo jogo (todas fazem o mesmo lock), não só entre duas
-- chamadas de vincular-time.
--
-- Autorização (capitão ou código de 4 dígitos) continua em código, antes de
-- chamar essa função — ela só decide vaga e grava, igual as outras três.
-- Membro que já tem QUALQUER linha em confirmacoes pra esse jogo (qualquer
-- status) é pulado sem alterar nada — mesmo comportamento que a rota já
-- tinha antes, só que agora atômico.
create or replace function vincular_time_pelada(p_game_id uuid, p_time_id uuid)
returns table (
  user_id uuid,
  nome text,
  novo_status text,
  game_local text,
  time_nome text
)
language plpgsql
as $$
declare
  v_game games%rowtype;
  v_time times%rowtype;
  v_membro record;
  v_vagas_restantes int;
  v_ja_existe boolean;
  v_status text;
  v_perfil profiles%rowtype;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then
    raise exception 'Pelada não encontrada.';
  end if;

  select * into v_time from times where id = p_time_id;
  if not found then
    raise exception 'Time não encontrado.';
  end if;

  select v_game.vagas_totais - count(*) into v_vagas_restantes
    from confirmacoes
    where confirmacoes.game_id = p_game_id and confirmacoes.status in ('aprovado', 'aguardando_confirmacao');

  for v_membro in
    select tm.user_id as uid from time_membros tm where tm.time_id = p_time_id and tm.status = 'aprovado'
  loop
    select exists(select 1 from confirmacoes c where c.game_id = p_game_id and c.user_id = v_membro.uid) into v_ja_existe;
    if v_ja_existe then
      continue;
    end if;

    select * into v_perfil from profiles where id = v_membro.uid;
    if not found then
      continue;
    end if;

    v_status := case when v_vagas_restantes > 0 then 'aprovado' else 'espera' end;

    insert into confirmacoes (game_id, user_id, nome, whatsapp, bairro, status)
      values (p_game_id, v_membro.uid, v_perfil.nome, v_perfil.whatsapp, v_perfil.bairro, v_status);

    if v_status = 'aprovado' then
      v_vagas_restantes := v_vagas_restantes - 1;
    end if;

    user_id := v_membro.uid;
    nome := v_perfil.nome;
    novo_status := v_status;
    game_local := v_game.local;
    time_nome := v_time.nome;
    return next;
  end loop;
end;
$$;

revoke execute on function vincular_time_pelada(uuid, uuid) from public, anon, authenticated;
