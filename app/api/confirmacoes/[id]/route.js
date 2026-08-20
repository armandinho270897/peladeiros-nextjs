import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { promoverEsperaComConfirmacao } from '@/lib/confirmacoesExpiry';
import { errJson } from '@/lib/apiError';

// Duas formas de cancelar uma confirmação:
// - o próprio jogador, autenticado, cancelando a própria presença (sem PIN nenhum)
// - o capitão de uma pelada antiga (sem owner_id) removendo alguém via código de 4 dígitos
async function authorizeCancel(confirmacao, codigo) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (user && confirmacao.user_id && user.id === confirmacao.user_id) return true;

  const { data: game } = await supabase.from('games').select('codigo').eq('id', confirmacao.game_id).single();
  return !!game && game.codigo === codigo;
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const { codigo } = await request.json().catch(() => ({}));

  const { data: confirmacao } = await supabase
    .from('confirmacoes')
    .select('game_id, status, user_id')
    .eq('id', id)
    .single();

  if (!confirmacao) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const autorizado = await authorizeCancel(confirmacao, codigo);
  if (!autorizado) return NextResponse.json({ error: 'Você não pode cancelar essa presença.' }, { status: 403 });

  // Mantém a linha (status 'cancelado') em vez de apagar — sem histórico
  // não dá pra calcular selo do capitão nem Moral depois.
  const { error: cancelError } = await supabase.from('confirmacoes').update({ status: 'cancelado', cancelado_em: new Date().toISOString() }).eq('id', id);
  if (cancelError) return errJson(cancelError.message, 500);

  if (confirmacao.status === 'aprovado' || confirmacao.status === 'aguardando_confirmacao') {
    await promoverEsperaComConfirmacao(confirmacao.game_id, 1);
  }

  return NextResponse.json({ ok: true });
}
