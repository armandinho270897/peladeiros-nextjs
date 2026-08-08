import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

async function checkCodigo(id, codigo) {
  const { data: game } = await supabase.from('games').select('codigo').eq('id', id).single();
  return game && game.codigo === codigo;
}

export async function GET(request, { params }) {
  const { id } = params;
  const { data: game, error } = await supabase
    .from('games')
    .select('*, confirmacoes(*)')
    .eq('id', id)
    .single();

  if (error || !game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  const { codigo, ...safe } = game;
  return NextResponse.json(safe);
}

export async function PATCH(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const { codigo, local, bairro, data, horario, vagasTotais } = body;

  const ok = await checkCodigo(id, codigo);
  if (!ok) return NextResponse.json({ error: 'Código incorreto.' }, { status: 403 });

  const { error } = await supabase
    .from('games')
    .update({ local, bairro, data, horario, vagas_totais: vagasTotais })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // se vagas aumentaram, promove quem estiver na fila de espera
  const { data: confirmacoes } = await supabase
    .from('confirmacoes')
    .select('*')
    .eq('game_id', id)
    .order('created_at', { ascending: true });

  const confirmados = confirmacoes.filter(c => c.status === 'confirmado');
  const espera = confirmacoes.filter(c => c.status === 'espera');
  const vagasLivres = vagasTotais - confirmados.length;

  if (vagasLivres > 0 && espera.length > 0) {
    const promover = espera.slice(0, vagasLivres).map(c => c.id);
    await supabase.from('confirmacoes').update({ status: 'confirmado' }).in('id', promover);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const { codigo } = await request.json();

  const ok = await checkCodigo(id, codigo);
  if (!ok) return NextResponse.json({ error: 'Código incorreto.' }, { status: 403 });

  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
