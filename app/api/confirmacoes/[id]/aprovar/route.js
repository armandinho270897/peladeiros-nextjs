import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request, { params }) {
  if (!checkRateLimit(`aprovar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { codigo } = await request.json().catch(() => ({}));

  const { data: confirmacao } = await supabase.from('confirmacoes').select('id, game_id, status').eq('id', id).single();
  if (!confirmacao) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
  if (confirmacao.status !== 'pendente') return NextResponse.json({ error: 'Essa solicitação já foi respondida.' }, { status: 409 });

  const { data: game } = await supabase.from('games').select('vagas_totais').eq('id', confirmacao.game_id).single();
  if (!game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  const auth = await authorizeGameOwner(confirmacao.game_id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { count } = await supabase
    .from('confirmacoes')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', confirmacao.game_id)
    .eq('status', 'aprovado');

  const novoStatus = count >= game.vagas_totais ? 'espera' : 'aprovado';

  const { data: atualizada, error } = await supabase
    .from('confirmacoes')
    .update({ status: novoStatus })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(atualizada);
}
