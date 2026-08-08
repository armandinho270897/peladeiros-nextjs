import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  const { id } = params;
  const { codigo } = await request.json();

  const { data: confirmacao } = await supabase
    .from('confirmacoes')
    .select('game_id, status')
    .eq('id', id)
    .single();

  if (!confirmacao) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const { data: game } = await supabase.from('games').select('codigo, vagas_totais').eq('id', confirmacao.game_id).single();
  if (!game || game.codigo !== codigo) return NextResponse.json({ error: 'Código incorreto.' }, { status: 403 });

  await supabase.from('confirmacoes').delete().eq('id', id);

  if (confirmacao.status === 'confirmado') {
    const { data: proximoDaFila } = await supabase
      .from('confirmacoes')
      .select('id')
      .eq('game_id', confirmacao.game_id)
      .eq('status', 'espera')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (proximoDaFila) {
      await supabase.from('confirmacoes').update({ status: 'confirmado' }).eq('id', proximoDaFila.id);
    }
  }

  return NextResponse.json({ ok: true });
}
