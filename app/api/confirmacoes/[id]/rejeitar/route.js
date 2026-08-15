import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';

export async function POST(request, { params }) {
  if (!checkRateLimit(`rejeitar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { codigo, mensagemCapitao } = await request.json().catch(() => ({}));
  const recadoCapitao = mensagemCapitao?.trim().slice(0, 200) || '';
  const sufixoRecado = recadoCapitao ? ` Recado do capitão: "${recadoCapitao}"` : '';

  const { data: confirmacao } = await supabase.from('confirmacoes').select('id, game_id, status, user_id').eq('id', id).single();
  if (!confirmacao) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
  if (confirmacao.status !== 'pendente') return NextResponse.json({ error: 'Essa solicitação já foi respondida.' }, { status: 409 });

  const auth = await authorizeGameOwner(confirmacao.game_id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: game } = await supabase.from('games').select('local').eq('id', confirmacao.game_id).single();

  const { data: atualizada, error } = await supabase
    .from('confirmacoes')
    .update({ status: 'rejeitado' })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (confirmacao.user_id) {
    await createNotification({
      userId: confirmacao.user_id,
      tipo: 'solicitacao_rejeitada',
      gameId: confirmacao.game_id,
      mensagem: `Sua solicitação em ${game?.local || 'uma pelada'} não foi aprovada dessa vez.${sufixoRecado}`,
    });
  }

  return NextResponse.json(atualizada);
}
