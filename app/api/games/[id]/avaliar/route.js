import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { todayISO } from '@/lib/gameUtils';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

async function getSessionUser() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  return user;
}

export async function GET(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const { data } = await supabase
    .from('avaliacoes')
    .select('avaliado_id')
    .eq('game_id', params.id)
    .eq('avaliador_id', user.id);

  return NextResponse.json({ avaliados: (data || []).map((a) => a.avaliado_id) });
}

export async function POST(request, { params }) {
  if (!checkRateLimit(`avaliar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas avaliações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra avaliar.' }, { status: 401 });

  const { id: gameId } = params;
  const { avaliacoes } = await request.json();

  if (!Array.isArray(avaliacoes) || avaliacoes.length === 0) {
    return NextResponse.json({ error: 'Nada pra avaliar.' }, { status: 400 });
  }

  const { data: game } = await supabase.from('games').select('data').eq('id', gameId).single();
  if (!game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });
  if (game.data >= todayISO()) {
    return NextResponse.json({ error: 'Só dá pra avaliar depois que a pelada acontecer.' }, { status: 400 });
  }

  const { data: aprovados } = await supabase
    .from('confirmacoes')
    .select('user_id')
    .eq('game_id', gameId)
    .eq('status', 'aprovado');

  const idsConfirmados = new Set((aprovados || []).map((c) => c.user_id).filter(Boolean));
  if (!idsConfirmados.has(user.id)) {
    return NextResponse.json({ error: 'Só quem confirmou presença pode avaliar essa pelada.' }, { status: 403 });
  }

  const rows = [];
  for (const av of avaliacoes) {
    const { avaliado_id: avaliadoId, nota, tag } = av;
    if (avaliadoId === user.id) continue; // ninguém avalia a si mesmo
    if (!idsConfirmados.has(avaliadoId)) continue; // só quem confirmou também
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) continue;
    rows.push({ game_id: gameId, avaliador_id: user.id, avaliado_id: avaliadoId, nota, tag: (tag || '').trim() || null });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Nenhuma avaliação válida pra salvar.' }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from('avaliacoes')
    .upsert(rows, { onConflict: 'game_id,avaliador_id,avaliado_id', ignoreDuplicates: true })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, salvas: inserted.length }, { status: 201 });
}
