import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Mesmo caminho de "adicionar jogador" usado na criação da pelada, só que
// aqui o capitão adiciona depois, na tela de gerenciar.
export async function POST(request, { params }) {
  if (!checkRateLimit(`adicionar-jogador:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { userId, codigo } = await request.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: 'Selecione um jogador.' }, { status: 400 });

  const auth = await authorizeGameOwner(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: game } = await supabase.from('games').select('vagas_totais').eq('id', id).single();
  if (!game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  const { data: profile } = await supabase.from('profiles').select('nome, whatsapp, bairro').eq('id', userId).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Jogador não encontrado.' }, { status: 404 });

  const { count } = await supabase
    .from('confirmacoes')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', id)
    .in('status', ['aprovado', 'aguardando_confirmacao']);

  const novoStatus = count >= game.vagas_totais ? 'espera' : 'aprovado';

  const { data: existente } = await supabase.from('confirmacoes').select('id').eq('game_id', id).eq('user_id', userId).maybeSingle();

  let resultado, error;
  if (existente) {
    ({ data: resultado, error } = await supabase.from('confirmacoes').update({ status: novoStatus }).eq('id', existente.id).select().single());
  } else {
    ({ data: resultado, error } = await supabase
      .from('confirmacoes')
      .insert({ game_id: id, user_id: userId, nome: profile.nome, whatsapp: profile.whatsapp, bairro: profile.bairro, status: novoStatus })
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(resultado, { status: 201 });
}
