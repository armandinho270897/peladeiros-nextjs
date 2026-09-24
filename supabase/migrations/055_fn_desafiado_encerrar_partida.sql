-- Encerrar uma partida do Desafiado mexe em vários lugares (a própria
-- partida, os dois times, e potencialmente cria a próxima partida) — se o
-- processo caísse no meio do caminho (timeout da função serverless, por
-- exemplo), podia sobrar estatística de um time atualizada e do outro não.
-- Numa função só, ou tudo acontece ou nada acontece.
--
-- "for update" na partida em_andamento serializa qualquer chamada
-- concorrente pra essa mesma sessão — a segunda chamada só continua
-- depois que a primeira terminar (commit ou rollback), e nesse ponto já
-- não vai mais achar partida em_andamento, então cai no caminho de erro
-- sozinha, sem precisar de outra trava em lugar nenhum.
--
-- `tipo` no retorno é o "roteamento" que a rota HTTP usa pra decidir o
-- status/formato da resposta (erro comum, empate sem critério escolhido,
-- pênaltis sem vencedor informado, prorrogação, ou resolvida de vez).
create or replace function desafiado_encerrar_partida(
  p_sessao_id uuid,
  p_criterio_desempate text,
  p_vencedor_penaltis_time_id uuid
)
returns table (
  tipo text,
  mensagem text,
  partida_id uuid,
  vencedor_time_id uuid,
  perdedor_time_id uuid,
  proxima_partida_id uuid,
  cara_time_cara_id uuid,
  cara_time_coroa_id uuid,
  cara_resultado text
)
language plpgsql
as $$
declare
  v_partida desafiado_partidas%rowtype;
  v_sessao desafiado_sessoes%rowtype;
  v_empatado boolean;
  v_vencedor_id uuid;
  v_perdedor_id uuid;
  v_gols_vencedor int;
  v_gols_perdedor int;
  v_time_cara uuid;
  v_time_coroa uuid;
  v_resultado text;
  v_time_vencedor desafiado_times%rowtype;
  v_time_perdedor desafiado_times%rowtype;
  v_maior_posicao int;
  v_total_times int;
  v_oponente desafiado_times%rowtype;
  v_nova_partida_id uuid;
begin
  select * into v_partida from desafiado_partidas
    where sessao_id = p_sessao_id and status = 'em_andamento'
    for update;
  if not found then
    return query select 'erro'::text, 'Nenhuma partida em andamento agora.'::text,
      null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::text;
    return;
  end if;

  v_empatado := v_partida.gols_time_a = v_partida.gols_time_b;

  if v_empatado then
    if p_criterio_desempate is null then
      return query select 'empate_sem_criterio'::text, 'Empatou — escolhe prorrogação, pênaltis ou cara-ou-coroa.'::text,
        v_partida.id, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::text;
      return;
    end if;

    if p_criterio_desempate = 'prorrogacao' then
      select * into v_sessao from desafiado_sessoes where id = p_sessao_id;
      update desafiado_partidas
        set criterio_desempate = 'prorrogacao',
            duracao_min = greatest(1, round(v_sessao.duracao_partida_min / 2.0)),
            iniciada_em = now()
        where id = v_partida.id;
      return query select 'prorrogacao'::text, null::text,
        v_partida.id, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::text;
      return;
    end if;

    if p_criterio_desempate = 'cara_coroa' then
      -- Sorteio duplo: 1) quem é cara/coroa entre os dois times, 2) o
      -- resultado da moeda — os dois passos independentes, cada um
      -- 50/50, pra ninguém poder alegar que o time "sempre é cara".
      v_time_cara := case when random() < 0.5 then v_partida.time_a_id else v_partida.time_b_id end;
      v_time_coroa := case when v_time_cara = v_partida.time_a_id then v_partida.time_b_id else v_partida.time_a_id end;
      v_resultado := case when random() < 0.5 then 'cara' else 'coroa' end;
      v_vencedor_id := case when v_resultado = 'cara' then v_time_cara else v_time_coroa end;
    elsif p_criterio_desempate = 'penaltis' then
      if p_vencedor_penaltis_time_id is distinct from v_partida.time_a_id
         and p_vencedor_penaltis_time_id is distinct from v_partida.time_b_id then
        return query select 'empate_penaltis_sem_vencedor'::text, 'Informa quem venceu os pênaltis.'::text,
          v_partida.id, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::text;
        return;
      end if;
      v_vencedor_id := p_vencedor_penaltis_time_id;
    else
      return query select 'erro'::text, 'Critério de desempate inválido.'::text,
        v_partida.id, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::text;
      return;
    end if;
  else
    v_vencedor_id := case when v_partida.gols_time_a > v_partida.gols_time_b then v_partida.time_a_id else v_partida.time_b_id end;
  end if;

  v_perdedor_id := case when v_vencedor_id = v_partida.time_a_id then v_partida.time_b_id else v_partida.time_a_id end;
  v_gols_vencedor := case when v_vencedor_id = v_partida.time_a_id then v_partida.gols_time_a else v_partida.gols_time_b end;
  v_gols_perdedor := case when v_vencedor_id = v_partida.time_a_id then v_partida.gols_time_b else v_partida.gols_time_a end;

  update desafiado_partidas
    set status = 'encerrada', vencedor_time_id = v_vencedor_id, encerrada_em = now(),
        criterio_desempate = case when v_empatado then p_criterio_desempate else null end
    where id = v_partida.id;

  select * into v_time_vencedor from desafiado_times where id = v_vencedor_id;
  select * into v_time_perdedor from desafiado_times where id = v_perdedor_id;

  update desafiado_times
    set vitorias = v_time_vencedor.vitorias + 1,
        gols_marcados = v_time_vencedor.gols_marcados + v_gols_vencedor,
        gols_sofridos = v_time_vencedor.gols_sofridos + v_gols_perdedor
    where id = v_vencedor_id;

  select max(posicao_fila), count(*) into v_maior_posicao, v_total_times
    from desafiado_times where sessao_id = p_sessao_id;

  update desafiado_times
    set derrotas = v_time_perdedor.derrotas + 1,
        gols_marcados = v_time_perdedor.gols_marcados + v_gols_perdedor,
        gols_sofridos = v_time_perdedor.gols_sofridos + v_gols_vencedor,
        posicao_fila = v_maior_posicao + 1
    where id = v_perdedor_id;

  select * into v_oponente from desafiado_times
    where sessao_id = p_sessao_id and id <> v_vencedor_id and id <> v_perdedor_id
    order by posicao_fila asc limit 1;

  -- Ninguém mais na fila: com só 2 times na sessão, o perdedor joga de
  -- novo contra o vencedor (fica só reprisando); com mais times (um deles
  -- só ainda não fechou, ou saiu), a sessão fica sem próxima partida por
  -- enquanto.
  if not found then
    if v_total_times = 2 then
      v_oponente := v_time_perdedor;
    else
      v_oponente.id := null;
    end if;
  end if;

  if v_oponente.id is not null then
    select duracao_partida_min into v_sessao.duracao_partida_min from desafiado_sessoes where id = p_sessao_id;
    insert into desafiado_partidas (sessao_id, time_a_id, time_b_id, duracao_min)
      values (p_sessao_id, v_vencedor_id, v_oponente.id, v_sessao.duracao_partida_min)
      returning id into v_nova_partida_id;
  end if;

  return query select 'resolvida'::text, null::text,
    v_partida.id, v_vencedor_id, v_perdedor_id, v_nova_partida_id, v_time_cara, v_time_coroa, v_resultado;
end;
$$;
