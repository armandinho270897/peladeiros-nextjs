import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// Peladas com owner_id (criadas com login) só são editáveis por quem é dono da sessão.
// Peladas antigas (owner_id nulo) continuam caindo no fallback do PIN de 4 dígitos.
async function authorize(id, codigo) {
  const { data: game } = await supabase.from('games').select('codigo, owner_id').eq('id', id).single();
  if (!game) return { ok: false, status: 404, error: 'Pelada não encontrada.' };

  if (game.owner_id) {
    const authClient = createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.id !== game.owner_id) {
      return { ok: false, status: 403, error: 'Só o dono dessa pelada pode editar.' };
    }
    return { ok: true };
  }

  if (game.codigo !== codigo) return { ok: false, status: 403, error: 'Código incorreto.' };
  return { ok: true };
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

  const auth = await authorize(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

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

  const auth = await authorize(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
