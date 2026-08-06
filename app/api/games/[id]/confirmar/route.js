import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const { id } = params;
  const { nome, whatsapp } = await request.json();

  if (!nome || !whatsapp) {
    return NextResponse.json({ error: 'Nome e WhatsApp são obrigatórios.' }, { status: 400 });
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('vagas_totais')
    .eq('id', id)
    .single();

  if (gameError || !game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  const { count } = await supabase
    .from('confirmacoes')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', id)
    .eq('status', 'confirmado');

  const status = count >= game.vagas_totais ? 'espera' : 'confirmado';

  const { data: confirmacao, error } = await supabase
    .from('confirmacoes')
    .insert({ game_id: id, nome, whatsapp, status })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(confirmacao, { status: 201 });
}
