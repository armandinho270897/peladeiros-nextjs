import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';
import { formarTimesCompletos } from '@/lib/desafiadoSorteio';

// Cria a sessão inteira de uma vez: local, tipo de jogo, tamanho de time,
// duração de partida e a lista de jogadores presentes — já sorteia os
// times, a ordem da fila, e cria a primeira partida (posições 0 e 1).
// Exige pelo menos 2 times completos pra começar (senão não tem quem jogar
// contra quem).
export async function POST(request) {
  if (!checkRateLimit(`desafiado:criar:${getClientIp(request)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitas sessões criadas em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra criar um Desafiado.' }, { status: 401 });

  const body = await request.json();
  const { local, bairro, latitude, longitude, arenaId, tipoJogo, tamanhoTime, duracaoMin, jogadores } = body;

  if (!local?.trim() || !bairro?.trim() || !tipoJogo?.trim()) {
    return NextResponse.json({ error: 'Preenche local, bairro e tipo de jogo.' }, { status: 400 });
  }
  const tamanho = Number(tamanhoTime);
  const duracao = Number(duracaoMin);
  if (!Number.isInteger(tamanho) || tamanho < 1) return NextResponse.json({ error: 'Tamanho de time inválido.' }, { status: 400 });
  if (!Number.isInteger(duracao) || duracao < 1) return NextResponse.json({ error: 'Duração da partida inválida.' }, { status: 400 });

  const listaJogadores = Array.isArray(jogadores) ? jogadores.filter((j) => j?.nome?.trim()) : [];
  if (listaJogadores.length < tamanho * 2) {
    return NextResponse.json({ error: `Precisa de pelo menos ${tamanho * 2} jogadores pra formar 2 times de ${tamanho} e começar.` }, { status: 400 });
  }

  const { data: sessao, error: sessaoError } = await supabase
    .from('desafiado_sessoes')
    .insert({
      criado_por: user.id, local: local.trim(), bairro: bairro.trim(),
      latitude: latitude ?? null, longitude: longitude ?? null, arena_id: arenaId ?? null,
      tipo_jogo: tipoJogo.trim(), tamanho_time: tamanho, duracao_partida_min: duracao,
    })
    .select()
    .single();
  if (sessaoError) return errJson(sessaoError.message, 500);

  const { times: gruposDeTimes, sobra } = formarTimesCompletos(listaJogadores, tamanho);

  const { data: timesCriados, error: timesError } = await supabase
    .from('desafiado_times')
    .insert(gruposDeTimes.map((_, i) => ({ sessao_id: sessao.id, numero: i + 1, posicao_fila: i })))
    .select();
  if (timesError) return errJson(timesError.message, 500);

  const linhasJogadores = [];
  gruposDeTimes.forEach((grupo, i) => {
    for (const j of grupo) linhasJogadores.push({ sessao_id: sessao.id, user_id: j.id ?? null, nome: j.nome.trim(), time_id: timesCriados[i].id });
  });
  for (const j of sobra) linhasJogadores.push({ sessao_id: sessao.id, user_id: j.id ?? null, nome: j.nome.trim(), time_id: null });

  const { error: jogadoresError } = await supabase.from('desafiado_jogadores').insert(linhasJogadores);
  if (jogadoresError) return errJson(jogadoresError.message, 500);

  const timeA = timesCriados.find((t) => t.posicao_fila === 0);
  const timeB = timesCriados.find((t) => t.posicao_fila === 1);
  const { error: partidaError } = await supabase.from('desafiado_partidas').insert({
    sessao_id: sessao.id, time_a_id: timeA.id, time_b_id: timeB.id, duracao_min: duracao,
  });
  if (partidaError) return errJson(partidaError.message, 500);

  return NextResponse.json({ id: sessao.id }, { status: 201 });
}
