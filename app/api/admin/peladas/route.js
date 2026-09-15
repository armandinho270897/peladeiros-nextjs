import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';

// Evita expor whatsapp de participante além do estritamente necessário —
// nem nesta tela administrativa (organizador identifica pelo nome).
export async function GET(request) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const data = searchParams.get('data');
  const bairro = searchParams.get('bairro');
  const arenaId = searchParams.get('arenaId');

  let query = supabase
    .from('games')
    .select('id, local, bairro, data, horario, capitao, owner_id, arena_id, vagas_totais, encerrada_em, pausada_em, pausada_motivo, created_at')
    .order('data', { ascending: false })
    .limit(100);

  if (data) query = query.eq('data', data);
  if (bairro) query = query.ilike('bairro', `%${bairro}%`);
  if (arenaId) query = query.eq('arena_id', arenaId);

  const { data: peladas, error } = await query;
  if (error) return errJson(error.message, 500);

  const gameIds = peladas.map((g) => g.id);
  const { data: confirmacoes } = gameIds.length
    ? await supabase.from('confirmacoes').select('game_id, status').in('game_id', gameIds).eq('status', 'aprovado')
    : { data: [] };
  const confirmadosPorGame = {};
  for (const c of confirmacoes || []) confirmadosPorGame[c.game_id] = (confirmadosPorGame[c.game_id] || 0) + 1;

  return NextResponse.json(peladas.map((g) => ({ ...g, confirmados: confirmadosPorGame[g.id] || 0 })));
}
