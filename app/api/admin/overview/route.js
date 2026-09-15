import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';

const JANELAS_MS = { hoje: 24 * 3600 * 1000, '7d': 7 * 24 * 3600 * 1000, '30d': 30 * 24 * 3600 * 1000 };

// Cards da Visão geral — números claros e ações pendentes, sem gráfico
// decorativo. Contagens "no período" usam created_at/cancelado_em real;
// arenas pendentes e denúncias pendentes são sempre o estado ATUAL da fila
// (não faz sentido filtrar por período uma fila de trabalho).
export async function GET(request) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const periodo = searchParams.get('periodo') || '7d';
  const janelaMs = JANELAS_MS[periodo] ?? JANELAS_MS['7d'];
  const desde = new Date(Date.now() - janelaMs).toISOString();

  const [
    { count: novosUsuarios },
    { count: peladasCriadas },
    { count: confirmacoes },
    { count: cancelamentos },
    { count: faltas },
    { count: arenasPendentes },
    { count: denunciasPendentes },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', desde),
    supabase.from('games').select('id', { count: 'exact', head: true }).gte('created_at', desde),
    supabase.from('confirmacoes').select('id', { count: 'exact', head: true }).eq('status', 'aprovado').gte('created_at', desde),
    supabase.from('confirmacoes').select('id', { count: 'exact', head: true }).eq('status', 'cancelado').gte('cancelado_em', desde),
    // Falta não tem timestamp próprio (só existe presente=false na mesma
    // linha da confirmação) — usa a data de encerramento da pelada (games,
    // join) como proxy de "quando essa falta aconteceu".
    supabase.from('confirmacoes').select('id, games!inner(encerrada_em)', { count: 'exact', head: true }).eq('presente', false).gte('games.encerrada_em', desde),
    supabase.from('arenas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('denuncias').select('id', { count: 'exact', head: true }).in('status', ['aberta', 'em_analise']),
  ]);

  return NextResponse.json({
    periodo,
    novosUsuarios: novosUsuarios ?? 0,
    peladasCriadas: peladasCriadas ?? 0,
    confirmacoes: confirmacoes ?? 0,
    cancelamentos: cancelamentos ?? 0,
    faltas: faltas ?? 0,
    arenasPendentes: arenasPendentes ?? 0,
    denunciasPendentes: denunciasPendentes ?? 0,
  });
}
