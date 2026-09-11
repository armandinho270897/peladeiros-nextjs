import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';

// Manda o lembrete (in-app + e-mail, categoria "urgente" já cuida disso —
// ver lib/notify.js) pro mensalista que ainda tá pendente no mês. Não
// mexe em status nenhum, só avisa — quem marca como pago é o
// POST /api/time-membros/[id]/mensalidade separado.
export async function POST(request, { params }) {
  if (!checkRateLimit(`cobrar-mensalidade:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { data: membro } = await supabase.from('time_membros').select('id, time_id, user_id').eq('id', id).single();
  if (!membro) return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });
  if (!membro.user_id) return NextResponse.json({ error: 'Esse jogador não tem conta pra receber aviso.' }, { status: 400 });

  const auth = await authorizeTimeCaptain(membro.time_id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: time } = await supabase.from('times').select('nome, mensalidade_valor').eq('id', membro.time_id).single();
  if (!time?.mensalidade_valor) {
    return NextResponse.json({ error: 'Esse time ainda não tem um valor de mensalidade definido.' }, { status: 400 });
  }

  await createNotification({
    userId: membro.user_id,
    tipo: 'cobranca_pagamento',
    mensagem: `Sua mensalidade de ${time.nome} tá pendente — R$ ${Number(time.mensalidade_valor).toFixed(2)}. Acerta com o capitão.`,
    atorUserId: auth.user.id,
  });

  return NextResponse.json({ ok: true });
}
