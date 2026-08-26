import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

export async function POST(request, { params }) {
  if (!checkRateLimit(`time-membros:sair:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const { data: membro } = await supabase.from('time_membros').select('id, time_id, user_id, papel, status').eq('id', id).single();
  if (!membro) return NextResponse.json({ error: 'Você não é membro desse time.' }, { status: 404 });
  if (membro.user_id !== user.id) return NextResponse.json({ error: 'Essa não é sua vaga no time.' }, { status: 403 });
  if (membro.status !== 'aprovado') return NextResponse.json({ error: 'Você não é membro aprovado desse time.' }, { status: 409 });

  // Capitão não sai direto — sairia um time sem capitão. Precisa transferir
  // a capitania pra outro membro antes, ou excluir o time.
  if (membro.papel === 'capitao') {
    return NextResponse.json({ error: 'Você é o capitão. Transfira a capitania pra outro membro ou exclua o time antes de sair.' }, { status: 409 });
  }

  const { data: time } = await supabase.from('times').select('nome').eq('id', membro.time_id).single();
  const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).maybeSingle();

  const { error } = await supabase.from('time_membros').delete().eq('id', id);
  if (error) return errJson(error.message, 500);

  const { data: capitaes } = await supabase
    .from('time_membros')
    .select('user_id')
    .eq('time_id', membro.time_id)
    .eq('papel', 'capitao')
    .eq('status', 'aprovado');

  for (const c of capitaes || []) {
    await createNotification({
      userId: c.user_id,
      tipo: 'saida_do_time',
      mensagem: `${profile?.nome || 'Um jogador'} saiu do time ${time?.nome || ''}.`,
      atorUserId: user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
