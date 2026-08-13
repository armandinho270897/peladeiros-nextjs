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
    .select('avaliado_id, tipo')
    .eq('game_id', params.id)
    .eq('avaliador_id', user.id);

  const rows = data || [];
  return NextResponse.json({
    avaliados: rows.filter((a) => a.tipo === 'jogador').map((a) => a.avaliado_id),
    capitaoAvaliado: rows.some((a) => a.tipo === 'capitao'),
    geralAvaliado: rows.some((a) => a.tipo === 'geral'),
  });
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

  const { data: game } = await supabase.from('games').select('data, encerrada_em, owner_id').eq('id', gameId).single();
  if (!game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });
  if (game.data >= todayISO()) {
    return NextResponse.json({ error: 'Só dá pra avaliar depois que a pelada acontecer.' }, { status: 400 });
  }
  if (!game.encerrada_em) {
    return NextResponse.json({ error: 'O capitão ainda não encerrou essa pelada — avaliações liberam depois disso.' }, { status: 400 });
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

  // tipo='jogador': nota pra outro jogador confirmado.
  // tipo='capitao': nota específica pro capitão (RF-005), só quem não é o
  // próprio capitão pode dar, e só mira o owner_id da pelada.
  // tipo='geral': nota pra partida como um todo, sem avaliado_id.
  const rowsComAlvo = [];
  let rowGeral = null;
  for (const av of avaliacoes) {
    const { avaliado_id: avaliadoId, nota, tag, tipo } = av;
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) continue;
    const tagLimpa = (tag || '').trim() || null;

    if (tipo === 'geral') {
      if (rowGeral) continue; // só uma avaliação geral por avaliador
      rowGeral = { game_id: gameId, avaliador_id: user.id, avaliado_id: null, nota, tag: tagLimpa, tipo: 'geral' };
      continue;
    }

    if (tipo === 'capitao') {
      if (!game.owner_id || avaliadoId !== game.owner_id) continue; // só mira o capitão real
      if (user.id === game.owner_id) continue; // capitão não avalia a si mesmo
      rowsComAlvo.push({ game_id: gameId, avaliador_id: user.id, avaliado_id: avaliadoId, nota, tag: tagLimpa, tipo: 'capitao' });
      continue;
    }

    // tipo padrão: 'jogador'
    if (avaliadoId === user.id) continue; // ninguém avalia a si mesmo
    if (!idsConfirmados.has(avaliadoId)) continue; // só quem confirmou também
    rowsComAlvo.push({ game_id: gameId, avaliador_id: user.id, avaliado_id: avaliadoId, nota, tag: tagLimpa, tipo: 'jogador' });
  }

  if (rowsComAlvo.length === 0 && !rowGeral) {
    return NextResponse.json({ error: 'Nenhuma avaliação válida pra salvar.' }, { status: 400 });
  }

  let salvas = 0;

  if (rowsComAlvo.length > 0) {
    const { data: inserted, error } = await supabase
      .from('avaliacoes')
      .upsert(rowsComAlvo, { onConflict: 'game_id,avaliador_id,avaliado_id,tipo', ignoreDuplicates: true })
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    salvas += inserted.length;
  }

  if (rowGeral) {
    const { data: jaTemGeral } = await supabase
      .from('avaliacoes')
      .select('id')
      .eq('game_id', gameId)
      .eq('avaliador_id', user.id)
      .eq('tipo', 'geral')
      .maybeSingle();
    if (!jaTemGeral) {
      const { error } = await supabase.from('avaliacoes').insert(rowGeral);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      salvas += 1;
    }
  }

  return NextResponse.json({ ok: true, salvas }, { status: 201 });
}
