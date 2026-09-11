import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';

export async function POST(request, { params }) {
  if (!checkRateLimit(`cobrar-pagamento:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { codigo } = await request.json().catch(() => ({}));

  const { data: confirmacao } = await supabase.from('confirmacoes').select('id, game_id, user_id').eq('id', id).single();
  if (!confirmacao) return NextResponse.json({ error: 'Confirmação não encontrada.' }, { status: 404 });
  if (!confirmacao.user_id) return NextResponse.json({ error: 'Esse jogador não tem conta pra receber aviso.' }, { status: 400 });

  const auth = await authorizeGameOwner(confirmacao.game_id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: game } = await supabase.from('games').select('local, valor').eq('id', confirmacao.game_id).single();
  if (!game?.valor) return NextResponse.json({ error: 'Essa pelada não tem valor definido.' }, { status: 400 });

  await createNotification({
    userId: confirmacao.user_id,
    tipo: 'cobranca_pagamento',
    gameId: confirmacao.game_id,
    mensagem: `Seu pagamento da pelada em ${game.local} tá pendente — R$ ${Number(game.valor).toFixed(2)}. Acerta com o capitão.`,
    atorUserId: auth.user?.id,
  });

  return NextResponse.json({ ok: true });
}
