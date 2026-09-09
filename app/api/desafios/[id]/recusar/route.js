import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

export async function POST(request, { params }) {
  if (!checkRateLimit(`desafios:recusar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;

  const { data: desafio } = await supabase.from('desafios').select('*').eq('id', id).maybeSingle();
  if (!desafio) return NextResponse.json({ error: 'Desafio não encontrado.' }, { status: 404 });
  if (desafio.status !== 'pendente') return NextResponse.json({ error: 'Esse desafio já foi respondido.' }, { status: 409 });

  const auth = await authorizeTimeCaptain(desafio.time_desafiado_id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabase
    .from('desafios')
    .update({ status: 'recusado', respondido_em: new Date().toISOString() })
    .eq('id', id);
  if (error) return errJson(error.message, 500);

  const { data: timeDesafiado } = await supabase.from('times').select('nome').eq('id', desafio.time_desafiado_id).maybeSingle();

  const { data: capitaesDesafiante } = await supabase
    .from('time_membros')
    .select('user_id')
    .eq('time_id', desafio.time_desafiante_id)
    .eq('papel', 'capitao')
    .eq('status', 'aprovado');

  for (const c of capitaesDesafiante || []) {
    await createNotification({
      userId: c.user_id,
      tipo: 'desafio_recusado',
      mensagem: `${timeDesafiado?.nome || 'O time'} recusou seu desafio.`,
      atorUserId: auth.user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
