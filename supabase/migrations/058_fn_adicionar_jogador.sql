-- Mesma corrida que a migration 054 corrigiu em aprovar_confirmacao, só
-- que nessa rota (capitão adiciona jogador direto, na tela de gerenciar):
-- contar vagas ocupadas e decidir aprovado/espera rodava em dois passos
-- sem trava. Confirmado ao vivo por auditoria: 2 chamadas simultâneas
-- pra última vaga de uma pelada de 2 vagas resultaram nas duas aprovadas
-- (3 ocupando 2 vagas). "for update" na linha do jogo serializa chamadas
-- concorrentes do MESMO jogo, igual em aprovar_confirmacao.
--
-- Autorização (ser capitão, ou código de 4 dígitos) continua em código,
-- antes de chamar essa função — ela só decide vaga e grava.
create or replace function adicionar_jogador_direto(p_game_id uuid, p_user_id uuid, p_nome_convidado text)
returns setof confirmacoes
language plpgsql
as $$
declare
  v_game games%rowtype;
  v_perfil profiles%rowtype;
  v_existente confirmacoes%rowtype;
  v_ocupadas int;
  v_novo_status text;
  v_resultado confirmacoes%rowtype;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then
    raise exception 'Pelada não encontrada.';
  end if;

  select count(*) into v_ocupadas from confirmacoes
    where confirmacoes.game_id = v_game.id and confirmacoes.status in ('aprovado', 'aguardando_confirmacao');
  v_novo_status := case when v_ocupadas < v_game.vagas_totais then 'aprovado' else 'espera' end;

  -- convidado sem conta: sempre uma linha nova (sem user_id pra vincular a um cadastro)
  if p_user_id is null then
    insert into confirmacoes (game_id, user_id, nome, whatsapp, bairro, status)
      values (p_game_id, null, p_nome_convidado, '', null, v_novo_status)
      returning * into v_resultado;
    return next v_resultado;
    return;
  end if;

  select * into v_perfil from profiles where id = p_user_id;
  if not found then
    raise exception 'Jogador não encontrado.';
  end if;

  select * into v_existente from confirmacoes where game_id = p_game_id and user_id = p_user_id;

  if found and v_existente.status in ('aprovado', 'aguardando_confirmacao') then
    raise exception 'Esse jogador já está na pelada.';
  end if;

  if found then
    update confirmacoes set status = v_novo_status, cancelado_em = null
      where id = v_existente.id
      returning * into v_resultado;
  else
    insert into confirmacoes (game_id, user_id, nome, whatsapp, bairro, status)
      values (p_game_id, p_user_id, v_perfil.nome, v_perfil.whatsapp, v_perfil.bairro, v_novo_status)
      returning * into v_resultado;
  end if;

  return next v_resultado;
end;
$$;
