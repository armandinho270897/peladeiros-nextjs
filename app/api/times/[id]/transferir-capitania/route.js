import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

export async function POST(request, { params }) {
  if (!checkRateLimit(`times:transferir-capitania:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { novoCapitaoUserId } = await request.json().catch(() => ({}));
  if (!novoCapitaoUserId) return NextResponse.json({ error: 'Selecione um jogador.' }, { status: 400 });

  const auth = await authorizeTimeCaptain(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (novoCapitaoUserId === auth.user.id) {
    return NextResponse.json({ error: 'Esse jogador já é o capitão.' }, { status: 400 });
  }

  const { data: novoCapitaoMembro } = await supabase
    .from('time_membros')
    .select('id')
    .eq('time_id', id)
    .eq('user_id', novoCapitaoUserId)
    .eq('status', 'aprovado')
    .maybeSingle();

  if (!novoCapitaoMembro) {
    return NextResponse.json({ error: 'Esse jogador não é membro aprovado do time.' }, { status: 404 });
  }

  const { data: time } = await supabase.from('times').select('nome').eq('id', id).single();

  const { error: erroNovo } = await supabase.from('time_membros').update({ papel: 'capitao' }).eq('id', novoCapitaoMembro.id);
  if (erroNovo) return errJson(erroNovo.message, 500);

  const { error: erroAntigo } = await supabase
    .from('time_membros')
    .update({ papel: 'membro' })
    .eq('time_id', id)
    .eq('user_id', auth.user.id);
  if (erroAntigo) {
    // Desfaz a promoção pra nunca deixar dois capitães aprovados ao mesmo
    // tempo — isso trava authorizeTimeCaptain (.maybeSingle() erra com mais
    // de uma linha) e ninguém mais consegue gerenciar o time.
    await supabase.from('time_membros').update({ papel: 'membro' }).eq('id', novoCapitaoMembro.id);
    return errJson(erroAntigo.message, 500);
  }

  await createNotification({
    userId: novoCapitaoUserId,
    tipo: 'capitania_transferida',
    mensagem: `Você agora é capitão do time ${time?.nome || ''}.`,
    atorUserId: auth.user.id,
  });

  return NextResponse.json({ ok: true });
}
