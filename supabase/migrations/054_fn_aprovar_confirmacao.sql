-- Aprovar uma solicitação de vaga precisa contar quantas vagas já estão
-- ocupadas e decidir, na mesma operação, se ainda cabe (aguardando
-- confirmação) ou vai pro banco de reservas (espera). Antes isso rodava
-- em duas etapas separadas (contar, depois atualizar) sem trava nenhuma:
-- duas aprovações do mesmo jogo ao mesmo tempo podiam contar a mesma vaga
-- livre duas vezes e lotar a pelada além do limite. Uma função só, numa
-- transação só, resolve isso — "for update" na linha do jogo serializa
-- aprovações concorrentes do MESMO jogo (aprovações de jogos diferentes
-- continuam livres, não brigam por lock nenhum).
--
-- Autorização (ser o capitão, ou o código de 4 dígitos) continua sendo
-- checada em código, antes de chamar essa função — ela só faz a transição
-- de estado, não sabe quem está pedindo.
create or replace function aprovar_confirmacao(p_confirmacao_id uuid, p_prazo_confirmacao_ms bigint)
returns table (
  confirmacao_id uuid,
  status text,
  prazo_confirmacao timestamptz,
  game_id uuid,
  user_id uuid,
  game_local text,
  game_data date,
  game_horario time,
  game_owner_id uuid
)
language plpgsql
as $$
declare
  v_confirmacao confirmacoes%rowtype;
  v_game games%rowtype;
  v_ocupadas int;
  v_novo_status text;
  v_prazo timestamptz;
begin
  select * into v_confirmacao from confirmacoes where id = p_confirmacao_id;
  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;
  if v_confirmacao.status <> 'pendente' then
    raise exception 'Essa solicitação já foi respondida.';
  end if;

  select * into v_game from games where id = v_confirmacao.game_id for update;
  if not found then
    raise exception 'Pelada não encontrada.';
  end if;

  select count(*) into v_ocupadas from confirmacoes
    where confirmacoes.game_id = v_game.id and confirmacoes.status in ('aprovado', 'aguardando_confirmacao');

  if v_ocupadas < v_game.vagas_totais then
    v_novo_status := 'aguardando_confirmacao';
    v_prazo := now() + (p_prazo_confirmacao_ms || ' milliseconds')::interval;
  else
    v_novo_status := 'espera';
    v_prazo := null;
  end if;

  update confirmacoes set status = v_novo_status, prazo_confirmacao = v_prazo
    where id = p_confirmacao_id;

  return query select
    p_confirmacao_id, v_novo_status, v_prazo,
    v_game.id, v_confirmacao.user_id, v_game.local, v_game.data, v_game.horario, v_game.owner_id;
end;
$$;
