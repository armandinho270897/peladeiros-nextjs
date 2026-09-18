import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';
import { authorizeDesafiadoCriador } from '@/lib/desafiadoAuth';

// Adiciona um jogador (com conta ou convidado) à lista de espera. Quando a
// espera junta gente suficiente pra fechar um time novo, forma o time na
// hora e manda pro final da fila — sem precisar de nenhuma ação manual do
// capitão além de adicionar as pessoas.
export async function POST(request, { params }) {
  if (!checkRateLimit(`desafiado:jogador:${getClientIp(request)}`, 30, 5 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const auth = await authorizeDesafiadoCriador(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: userId, nome } = await request.json().catch(() => ({}));
  if (!nome?.trim()) return NextResponse.json({ error: 'Informe o nome do jogador.' }, { status: 400 });

  const { data: sessao } = await supabase.from('desafiado_sessoes').select('tamanho_time, status').eq('id', id).single();
  if (sessao.status !== 'ativa') return NextResponse.json({ error: 'Essa sessão já foi encerrada.' }, { status: 400 });

  if (userId) {
    const { data: jaEsta } = await supabase.from('desafiado_jogadores').select('id').eq('sessao_id', id).eq('user_id', userId).maybeSingle();
    if (jaEsta) return NextResponse.json({ error: 'Esse jogador já está nessa sessão.' }, { status: 409 });
  }

  const { error: insertError } = await supabase.from('desafiado_jogadores').insert({
    sessao_id: id, user_id: userId ?? null, nome: nome.trim(), time_id: null,
  });
  if (insertError) {
    if (insertError.code === '23505') return NextResponse.json({ error: 'Esse jogador já está nessa sessão.' }, { status: 409 });
    return errJson(insertError.message, 500);
  }

  const { data: espera } = await supabase
    .from('desafiado_jogadores')
    .select('id')
    .eq('sessao_id', id)
    .is('time_id', null)
    .order('created_at', { ascending: true });

  let timeFormado = null;
  if ((espera || []).length >= sessao.tamanho_time) {
    const { data: ultimoTime } = await supabase
      .from('desafiado_times')
      .select('numero, posicao_fila')
      .eq('sessao_id', id)
      .order('posicao_fila', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: novoTime, error: timeError } = await supabase
      .from('desafiado_times')
      .insert({ sessao_id: id, numero: (ultimoTime?.numero || 0) + 1, posicao_fila: (ultimoTime?.posicao_fila ?? -1) + 1 })
      .select()
      .single();
    if (timeError) return errJson(timeError.message, 500);

    const idsParaTime = espera.slice(0, sessao.tamanho_time).map((j) => j.id);
    const { error: updateError } = await supabase.from('desafiado_jogadores').update({ time_id: novoTime.id }).in('id', idsParaTime);
    if (updateError) return errJson(updateError.message, 500);
    timeFormado = novoTime;
  }

  return NextResponse.json({ ok: true, timeFormado }, { status: 201 });
}
