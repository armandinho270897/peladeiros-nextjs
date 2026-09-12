import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';
import { checkinJanelaAberta, CHECKIN_UNDO_MS } from '@/lib/gameUtils';

// Check-in: só o próprio jogador, autenticado, registra a própria chegada.
// Sinal de presença, não punição — por isso também marca presente=true (é
// o mesmo campo que o encerramento usa; reaproveita em vez de duplicar).
export async function POST(request, { params }) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra fazer check-in.' }, { status: 401 });

  if (!checkRateLimit(`checkin:${user.id}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { data: confirmacao } = await supabase
    .from('confirmacoes')
    .select('id, user_id, status, checkin_at, game_id, games(data, horario, encerrada_em)')
    .eq('id', id)
    .single();

  if (!confirmacao) return NextResponse.json({ error: 'Confirmação não encontrada.' }, { status: 404 });
  if (confirmacao.user_id !== user.id) return NextResponse.json({ error: 'Esse check-in não é seu.' }, { status: 403 });
  if (confirmacao.status !== 'aprovado') {
    return NextResponse.json({ error: 'Só quem está confirmado pode fazer check-in.' }, { status: 409 });
  }
  const game = confirmacao.games;
  if (!game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });
  if (game.encerrada_em) return NextResponse.json({ error: 'Essa partida já foi encerrada.' }, { status: 409 });
  if (!checkinJanelaAberta(game)) {
    return NextResponse.json({ error: 'O check-in ainda não abriu pra essa pelada.' }, { status: 409 });
  }
  if (confirmacao.checkin_at) {
    return NextResponse.json({ error: 'Você já fez check-in nessa pelada.', checkinAt: confirmacao.checkin_at }, { status: 409 });
  }

  const agora = new Date().toISOString();
  // .is('checkin_at', null) de novo aqui, além da checagem acima: protege
  // contra corrida de dois cliques/abas — só o primeiro UPDATE que
  // encontrar a linha ainda com checkin_at null vence; o Postgres serializa
  // updates concorrentes na mesma linha, então o segundo já enxerga o valor
  // setado pelo primeiro e não bate no WHERE.
  const { data: atualizada, error } = await supabase
    .from('confirmacoes')
    .update({ checkin_at: agora, presente: true })
    .eq('id', id)
    .is('checkin_at', null)
    .select('id, checkin_at')
    .maybeSingle();

  if (error) return errJson(error.message, 500);
  if (!atualizada) {
    return NextResponse.json({ error: 'Você já fez check-in nessa pelada.' }, { status: 409 });
  }

  return NextResponse.json({ ok: true, checkinAt: atualizada.checkin_at, undoAteMs: CHECKIN_UNDO_MS });
}

// Desfazer — só nos primeiros 5min após o check-in (CHECKIN_UNDO_MS) e só
// antes da partida ser encerrada. Reverte também presente=true (efeito
// colateral do check-in original) pra não deixar rastro de uma chegada que
// a própria pessoa cancelou.
export async function DELETE(request, { params }) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  if (!checkRateLimit(`checkin-undo:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { data: confirmacao } = await supabase
    .from('confirmacoes')
    .select('id, user_id, checkin_at, games(encerrada_em)')
    .eq('id', id)
    .single();

  if (!confirmacao) return NextResponse.json({ error: 'Confirmação não encontrada.' }, { status: 404 });
  if (confirmacao.user_id !== user.id) return NextResponse.json({ error: 'Esse check-in não é seu.' }, { status: 403 });
  if (!confirmacao.checkin_at) return NextResponse.json({ error: 'Você ainda não fez check-in.' }, { status: 409 });
  if (confirmacao.games?.encerrada_em) return NextResponse.json({ error: 'Essa partida já foi encerrada.' }, { status: 409 });

  const desde = Date.now() - new Date(confirmacao.checkin_at).getTime();
  if (desde > CHECKIN_UNDO_MS) {
    return NextResponse.json({ error: 'Não dá mais pra desfazer — o check-in já tem mais de 5 minutos.' }, { status: 409 });
  }

  const { error } = await supabase.from('confirmacoes').update({ checkin_at: null, presente: null }).eq('id', id);
  if (error) return errJson(error.message, 500);

  return NextResponse.json({ ok: true });
}
