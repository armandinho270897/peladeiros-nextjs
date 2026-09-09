import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

export async function POST(request, { params }) {
  if (!checkRateLimit(`time-membros:rejeitar-solicitacao:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { data: solicitacao } = await supabase.from('time_membros').select('id, time_id, user_id, status').eq('id', id).single();
  if (!solicitacao) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  if (solicitacao.status !== 'solicitado') return NextResponse.json({ error: 'Esse pedido já foi respondido.' }, { status: 409 });

  const auth = await authorizeTimeCaptain(solicitacao.time_id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: atualizado, error } = await supabase.from('time_membros').update({ status: 'rejeitado' }).eq('id', id).select().single();
  if (error) return errJson(error.message, 500);

  const { data: time } = await supabase.from('times').select('nome').eq('id', solicitacao.time_id).single();
  await createNotification({
    userId: solicitacao.user_id,
    tipo: 'solicitacao_time_recusada',
    mensagem: `Seu pedido pra entrar no time ${time?.nome || ''} foi recusado.`,
    atorUserId: auth.user.id,
  });

  return NextResponse.json(atualizado);
}
