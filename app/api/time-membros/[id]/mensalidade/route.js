import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

// Mês de referência sempre normalizado pro dia 1 — junto com a unique
// constraint (time_membro_id, mes_referencia) da migration 034, garante
// no máximo 1 registro de pagamento por mensalista por mês, não importa
// que dia do mês o capitão clicou.
function primeiroDiaDoMes(mesReferencia) {
  const base = mesReferencia ? new Date(mesReferencia) : new Date();
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-01`;
}

async function carregarMembro(id) {
  return supabase.from('time_membros').select('id, time_id, user_id, mensalista').eq('id', id).single();
}

// Marca a mensalidade do mês como paga — presença da linha em
// `mensalidades` É o "pago"; não existe status separado.
export async function POST(request, { params }) {
  if (!checkRateLimit(`mensalidade:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { data: membro } = await carregarMembro(id);
  if (!membro) return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });

  const auth = await authorizeTimeCaptain(membro.time_id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: time } = await supabase.from('times').select('nome, mensalidade_valor').eq('id', membro.time_id).single();
  if (!time?.mensalidade_valor) {
    return NextResponse.json({ error: 'Esse time ainda não tem um valor de mensalidade definido.' }, { status: 400 });
  }

  const { mesReferencia } = await request.json().catch(() => ({}));
  const mes = primeiroDiaDoMes(mesReferencia);

  const { error } = await supabase.from('mensalidades').upsert(
    { time_membro_id: id, mes_referencia: mes, valor: time.mensalidade_valor, registrado_por: auth.user.id, pago_em: new Date().toISOString() },
    { onConflict: 'time_membro_id,mes_referencia' },
  );
  if (error) return errJson(error.message, 500);

  return NextResponse.json({ ok: true });
}

// Desfaz — remove a linha do mês, volta a contar como pendente.
export async function DELETE(request, { params }) {
  const { id } = params;
  const { data: membro } = await carregarMembro(id);
  if (!membro) return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });

  const auth = await authorizeTimeCaptain(membro.time_id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { mesReferencia } = await request.json().catch(() => ({}));
  const mes = primeiroDiaDoMes(mesReferencia);

  const { error } = await supabase.from('mensalidades').delete().eq('time_membro_id', id).eq('mes_referencia', mes);
  if (error) return errJson(error.message, 500);

  return NextResponse.json({ ok: true });
}
