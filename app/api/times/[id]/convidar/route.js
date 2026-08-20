import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

export async function POST(request, { params }) {
  if (!checkRateLimit(`times:convidar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitos convites em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { userId } = await request.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: 'Selecione um jogador.' }, { status: 400 });

  const auth = await authorizeTimeCaptain(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: time } = await supabase.from('times').select('nome').eq('id', id).single();
  if (!time) return NextResponse.json({ error: 'Time não encontrado.' }, { status: 404 });

  const { data: convidadoProfile } = await supabase.from('profiles').select('id, nome').eq('id', userId).maybeSingle();
  if (!convidadoProfile) return NextResponse.json({ error: 'Jogador não encontrado.' }, { status: 404 });

  const { data: existente } = await supabase
    .from('time_membros')
    .select('id, status')
    .eq('time_id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existente && existente.status !== 'rejeitado') {
    return NextResponse.json({ error: 'Esse jogador já foi convidado ou já é do time.' }, { status: 409 });
  }

  let resultado, error;
  if (existente) {
    ({ data: resultado, error } = await supabase.from('time_membros').update({ status: 'pendente' }).eq('id', existente.id).select().single());
  } else {
    ({ data: resultado, error } = await supabase
      .from('time_membros')
      .insert({ time_id: id, user_id: userId, papel: 'membro', status: 'pendente' })
      .select()
      .single());
  }

  if (error) return errJson(error.message, 500);

  await createNotification({
    userId,
    tipo: 'convite_time',
    mensagem: `Você foi convidado pro time ${time.nome}.`,
    atorUserId: auth.user.id,
  });

  return NextResponse.json(resultado, { status: 201 });
}
