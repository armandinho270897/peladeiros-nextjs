import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/notify';

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

  const { data: game } = await supabase.from('games').select('local').eq('id', confirmacao.game_id).single();

  await supabase.from('confirmacoes').delete().eq('id', id);

  if (confirmacao.status === 'aprovado') {
    const { data: proximoDaFila } = await supabase
      .from('confirmacoes')
      .select('id, user_id')
      .eq('game_id', confirmacao.game_id)
      .eq('status', 'espera')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (proximoDaFila) {
      await supabase.from('confirmacoes').update({ status: 'aprovado' }).eq('id', proximoDaFila.id);
      if (proximoDaFila.user_id) {
        await createNotification({
          userId: proximoDaFila.user_id,
          tipo: 'promovido_da_espera',
          gameId: confirmacao.game_id,
          mensagem: `Uma vaga abriu em ${game?.local || 'sua pelada'} e você foi promovido do banco de reservas!`,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
