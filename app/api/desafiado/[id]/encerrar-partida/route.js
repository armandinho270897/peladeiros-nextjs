import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeDesafiadoCriador } from '@/lib/desafiadoAuth';

// Fecha a partida em andamento. Sem empate, resolve na hora. Empatada,
// exige um critério de desempate no corpo — prorrogação reinicia o
// cronômetro na mesma partida (sem resolver ainda); pênaltis e cara-ou-coroa
// resolvem o vencedor aqui mesmo. Depois de resolver: perdedor vai pro
// final da fila (maior posicao_fila + 1, sem precisar renumerar ninguém),
// vencedor mantém a posição que já tinha, e a próxima partida já nasce
// sozinha contra quem tiver a menor posicao_fila da fila.
export async function POST(request, { params }) {
  const { id } = params;
  const auth = await authorizeDesafiadoCriador(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { criterioDesempate, vencedorPenaltisTimeId } = await request.json().catch(() => ({}));

  const { data: partida } = await supabase.from('desafiado_partidas').select('*').eq('sessao_id', id).eq('status', 'em_andamento').maybeSingle();
  if (!partida) return NextResponse.json({ error: 'Nenhuma partida em andamento agora.' }, { status: 400 });

  const empatado = partida.gols_time_a === partida.gols_time_b;
  let vencedorTimeId;
  let coinFlip = null;

  if (empatado) {
    if (!criterioDesempate) {
      return NextResponse.json({ error: 'Empatou — escolhe prorrogação, pênaltis ou cara-ou-coroa.', empatado: true }, { status: 409 });
    }

    if (criterioDesempate === 'prorrogacao') {
      const { data: atualizada, error } = await supabase
        .from('desafiado_partidas')
        .update({ criterio_desempate: 'prorrogacao', duracao_min: Math.max(1, Math.round(partida.duracao_min / 2)), iniciada_em: new Date().toISOString() })
        .eq('id', partida.id)
        .select()
        .single();
      if (error) return errJson(error.message, 500);
      return NextResponse.json({ prorrogacao: true, partida: atualizada });
    }

    if (criterioDesempate === 'cara_coroa') {
      // Sorteio duplo: 1) quem é cara/coroa entre os dois times, 2) o
      // resultado da moeda — os dois passos são independentes e cada um
      // 50/50, pra ninguém poder alegar que o time "sempre é cara".
      const timeCaraId = Math.random() < 0.5 ? partida.time_a_id : partida.time_b_id;
      const timeCoroaId = timeCaraId === partida.time_a_id ? partida.time_b_id : partida.time_a_id;
      const resultado = Math.random() < 0.5 ? 'cara' : 'coroa';
      vencedorTimeId = resultado === 'cara' ? timeCaraId : timeCoroaId;
      coinFlip = { timeCaraId, timeCoroaId, resultado };
    } else if (criterioDesempate === 'penaltis') {
      if (vencedorPenaltisTimeId !== partida.time_a_id && vencedorPenaltisTimeId !== partida.time_b_id) {
        return NextResponse.json({ error: 'Informa quem venceu os pênaltis.', empatado: true, criterioDesempate: 'penaltis' }, { status: 409 });
      }
      vencedorTimeId = vencedorPenaltisTimeId;
    } else {
      return NextResponse.json({ error: 'Critério de desempate inválido.' }, { status: 400 });
    }
  } else {
    vencedorTimeId = partida.gols_time_a > partida.gols_time_b ? partida.time_a_id : partida.time_b_id;
  }

  const perdedorTimeId = vencedorTimeId === partida.time_a_id ? partida.time_b_id : partida.time_a_id;
  const golsVencedor = vencedorTimeId === partida.time_a_id ? partida.gols_time_a : partida.gols_time_b;
  const golsPerdedor = vencedorTimeId === partida.time_a_id ? partida.gols_time_b : partida.gols_time_a;

  const { error: encerraError } = await supabase
    .from('desafiado_partidas')
    .update({ status: 'encerrada', vencedor_time_id: vencedorTimeId, encerrada_em: new Date().toISOString(), criterio_desempate: empatado ? criterioDesempate : null })
    .eq('id', partida.id);
  if (encerraError) return errJson(encerraError.message, 500);

  const { data: timeVencedor } = await supabase.from('desafiado_times').select('*').eq('id', vencedorTimeId).single();
  const { data: timePerdedor } = await supabase.from('desafiado_times').select('*').eq('id', perdedorTimeId).single();

  await supabase.from('desafiado_times').update({
    vitorias: timeVencedor.vitorias + 1,
    gols_marcados: timeVencedor.gols_marcados + golsVencedor,
    gols_sofridos: timeVencedor.gols_sofridos + golsPerdedor,
  }).eq('id', vencedorTimeId);

  const { data: todosOsTimes } = await supabase.from('desafiado_times').select('id, posicao_fila').eq('sessao_id', id);
  const maiorPosicao = Math.max(...(todosOsTimes || []).map((t) => t.posicao_fila));

  await supabase.from('desafiado_times').update({
    derrotas: timePerdedor.derrotas + 1,
    gols_marcados: timePerdedor.gols_marcados + golsPerdedor,
    gols_sofridos: timePerdedor.gols_sofridos + golsVencedor,
    posicao_fila: maiorPosicao + 1,
  }).eq('id', perdedorTimeId);

  const { data: proximoDaFila } = await supabase
    .from('desafiado_times')
    .select('*')
    .eq('sessao_id', id)
    .neq('id', vencedorTimeId)
    .neq('id', perdedorTimeId)
    .order('posicao_fila', { ascending: true })
    .limit(1)
    .maybeSingle();

  const oponente = proximoDaFila || (todosOsTimes.length === 2 ? timePerdedor : null);

  let proximaPartida = null;
  if (oponente) {
    const { data: sessao } = await supabase.from('desafiado_sessoes').select('duracao_partida_min').eq('id', id).single();
    const { data: nova } = await supabase
      .from('desafiado_partidas')
      .insert({ sessao_id: id, time_a_id: vencedorTimeId, time_b_id: oponente.id, duracao_min: sessao.duracao_partida_min })
      .select()
      .single();
    proximaPartida = nova;
  }

  return NextResponse.json({ vencedorTimeId, perdedorTimeId, proximaPartida, coinFlip });
}
