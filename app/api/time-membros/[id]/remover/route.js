import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

export async function POST(request, { params }) {
  if (!checkRateLimit(`time-membros:remover:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { data: membro } = await supabase.from('time_membros').select('id, time_id, user_id, papel, status').eq('id', id).single();
  if (!membro) return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });

  const auth = await authorizeTimeCaptain(membro.time_id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (membro.papel === 'capitao') {
    return NextResponse.json({ error: 'O capitão não pode se remover assim. Transfira a capitania ou exclua o time.' }, { status: 409 });
  }

  const { data: time } = await supabase.from('times').select('nome').eq('id', membro.time_id).single();

  const { error } = await supabase.from('time_membros').delete().eq('id', id);
  if (error) return errJson(error.message, 500);

  if (membro.status === 'aprovado') {
    await createNotification({
      userId: membro.user_id,
      tipo: 'membro_removido_time',
      mensagem: `Você foi removido do time ${time?.nome || ''}.`,
      atorUserId: auth.user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
