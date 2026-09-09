import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

// Caminho inverso do convite: o jogador pede pra entrar, o capitão aprova
// ou rejeita depois (app/api/time-membros/[id]/aprovar-solicitacao|
// rejeitar-solicitacao). Só times com recrutamento ativo aceitam pedido.
export async function POST(request, { params }) {
  if (!checkRateLimit(`times:pedir-entrada:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra pedir pra entrar.' }, { status: 401 });

  const { data: time } = await supabase.from('times').select('nome, recrutamento, max_jogadores').eq('id', id).maybeSingle();
  if (!time) return NextResponse.json({ error: 'Time não encontrado.' }, { status: 404 });
  if (time.recrutamento === 'fechado') return NextResponse.json({ error: 'Esse time não está recrutando agora.' }, { status: 400 });

  const { count: totalAprovados } = await supabase
    .from('time_membros')
    .select('id', { count: 'exact', head: true })
    .eq('time_id', id)
    .eq('status', 'aprovado');
  if ((totalAprovados || 0) >= time.max_jogadores) {
    return NextResponse.json({ error: 'Esse time já está com o elenco cheio.' }, { status: 400 });
  }

  const { data: existente } = await supabase
    .from('time_membros')
    .select('id, status')
    .eq('time_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existente && existente.status !== 'rejeitado') {
    return NextResponse.json({ error: 'Você já é do time ou já tem um pedido/convite em aberto.' }, { status: 409 });
  }

  let resultado, error;
  if (existente) {
    ({ data: resultado, error } = await supabase.from('time_membros').update({ status: 'solicitado' }).eq('id', existente.id).select().single());
  } else {
    ({ data: resultado, error } = await supabase
      .from('time_membros')
      .insert({ time_id: id, user_id: user.id, papel: 'membro', status: 'solicitado' })
      .select()
      .single());
  }
  if (error) return errJson(error.message, 500);

  const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).maybeSingle();
  const { data: capitaes } = await supabase
    .from('time_membros')
    .select('user_id')
    .eq('time_id', id)
    .eq('papel', 'capitao')
    .eq('status', 'aprovado');

  for (const c of capitaes || []) {
    await createNotification({
      userId: c.user_id,
      tipo: 'solicitacao_time_recebida',
      mensagem: `${profile?.nome || 'Um jogador'} pediu pra entrar no seu time ${time.nome}.`,
      atorUserId: user.id,
    });
  }

  return NextResponse.json(resultado, { status: 201 });
}
