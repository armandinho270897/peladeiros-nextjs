import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeDesafiadoCriador } from '@/lib/desafiadoAuth';

export async function POST(request, { params }) {
  const { id } = params;
  const auth = await authorizeDesafiadoCriador(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { timeId, jogadorId, desfazer } = await request.json().catch(() => ({}));
  if (!timeId) return NextResponse.json({ error: 'Informe o time.' }, { status: 400 });

  const { data: partida } = await supabase.from('desafiado_partidas').select('*').eq('sessao_id', id).eq('status', 'em_andamento').maybeSingle();
  if (!partida) return NextResponse.json({ error: 'Nenhuma partida em andamento agora.' }, { status: 400 });

  let campo;
  if (timeId === partida.time_a_id) campo = 'gols_time_a';
  else if (timeId === partida.time_b_id) campo = 'gols_time_b';
  else return NextResponse.json({ error: 'Esse time não está jogando essa partida.' }, { status: 400 });

  if (desfazer) {
    // Acha o gol mais recente desse time nessa partida ANTES de mexer no
    // placar — se não achar nada, sai sem tocar em nada (nem no contador).
    const { data: ultimoGol } = await supabase
      .from('desafiado_gols')
      .select('id')
      .eq('partida_id', partida.id)
      .eq('time_id', timeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ultimoGol || partida[campo] <= 0) {
      return NextResponse.json({ error: 'Esse time já está com 0 gols.' }, { status: 400 });
    }

    // Decrementa o placar (com checagem otimista) antes de apagar o
    // evento — se dois "desfazer" chegarem juntos, só um consegue
    // decrementar, e só esse continua pra apagar o gol de verdade.
    const { data: atualizada, error } = await supabase
      .from('desafiado_partidas')
      .update({ [campo]: partida[campo] - 1 })
      .eq('id', partida.id)
      .eq('status', 'em_andamento')
      .eq(campo, partida[campo])
      .select()
      .maybeSingle();
    if (error) return errJson(error.message, 500);
    if (!atualizada) return NextResponse.json({ error: 'O placar mudou agora há pouco. Tenta de novo.' }, { status: 409 });

    const { error: delError } = await supabase.from('desafiado_gols').delete().eq('id', ultimoGol.id);
    if (delError) {
      // Não conseguiu apagar o evento — desfaz o decremento pra não ficar
      // com o placar menor sem o gol correspondente ter sido removido.
      await supabase.from('desafiado_partidas').update({ [campo]: partida[campo] }).eq('id', partida.id);
      return errJson(delError.message, 500);
    }

    return NextResponse.json(atualizada);
  }

  if (!jogadorId) return NextResponse.json({ error: 'Informa quem marcou.' }, { status: 400 });
  const { data: jogador } = await supabase.from('desafiado_jogadores').select('id, time_id').eq('id', jogadorId).maybeSingle();
  if (!jogador || jogador.time_id !== timeId) {
    return NextResponse.json({ error: 'Esse jogador não está nesse time.' }, { status: 400 });
  }

  // Só altera se o placar ainda for o que lemos — dois toques rápidos não
  // perdem gol nem duplicam; quem perde a corrida recebe 409 e tenta de novo.
  const { data: atualizada, error } = await supabase
    .from('desafiado_partidas')
    .update({ [campo]: partida[campo] + 1 })
    .eq('id', partida.id)
    .eq('status', 'em_andamento')
    .eq(campo, partida[campo])
    .select()
    .maybeSingle();
  if (error) return errJson(error.message, 500);
  if (!atualizada) return NextResponse.json({ error: 'O placar mudou agora há pouco. Tenta de novo.' }, { status: 409 });

  const { error: golError } = await supabase.from('desafiado_gols').insert({
    sessao_id: id, partida_id: partida.id, time_id: timeId, jogador_id: jogadorId,
  });
  if (golError) {
    // Contou o gol no placar mas não deu pra registrar quem marcou —
    // desfaz o incremento pra não ficar um gol "fantasma" sem artilheiro.
    await supabase.from('desafiado_partidas').update({ [campo]: partida[campo] }).eq('id', partida.id);
    return errJson(golError.message, 500);
  }

  return NextResponse.json(atualizada);
}
