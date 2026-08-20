import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

export async function POST(request, { params }) {
  if (!checkRateLimit(`time-membros:recusar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const { data: convite } = await supabase.from('time_membros').select('id, time_id, user_id, status').eq('id', id).single();
  if (!convite) return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 });
  if (convite.user_id !== user.id) return NextResponse.json({ error: 'Esse convite não é seu.' }, { status: 403 });
  if (convite.status !== 'pendente') return NextResponse.json({ error: 'Esse convite já foi respondido.' }, { status: 409 });

  const { data: atualizado, error } = await supabase.from('time_membros').update({ status: 'rejeitado' }).eq('id', id).select().single();
  if (error) return errJson(error.message, 500);

  const { data: time } = await supabase.from('times').select('nome').eq('id', convite.time_id).single();
  const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).maybeSingle();
  const { data: capitaes } = await supabase
    .from('time_membros')
    .select('user_id')
    .eq('time_id', convite.time_id)
    .eq('papel', 'capitao')
    .eq('status', 'aprovado');

  for (const c of capitaes || []) {
    await createNotification({
      userId: c.user_id,
      tipo: 'convite_time_recusado',
      mensagem: `${profile?.nome || 'Um jogador'} recusou o convite pro time ${time?.nome || ''}.`,
      atorUserId: user.id,
    });
  }

  return NextResponse.json(atualizado);
}
