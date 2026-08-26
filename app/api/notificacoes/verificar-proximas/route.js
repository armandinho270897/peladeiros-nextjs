import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';
import { inicioDoJogo } from '@/lib/gameUtils';

const JANELA_MS = 3 * 60 * 60 * 1000; // "em breve" = começa dentro de 3h

// Chamada quando o app abre (ver AuthProvider.js) — não é push, é só uma
// checagem local que cria a notificação na hora se ainda não existir uma
// igual, então não duplica a cada abertura.
export async function POST() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  if (!checkRateLimit(`verificar-proximas:${user.id}`)) {
    return NextResponse.json({ ok: true, criadas: 0 });
  }

  const { data: confirmacoes } = await supabase
    .from('confirmacoes')
    .select('game_id, games(id, local, data, horario)')
    .eq('user_id', user.id)
    .eq('status', 'aprovado');

  const agora = Date.now();
  const candidatos = (confirmacoes || []).filter((c) => {
    if (!c.games?.data || !c.games?.horario) return false;
    const diff = inicioDoJogo(c.games).getTime() - agora;
    return diff >= 0 && diff < JANELA_MS;
  });

  if (candidatos.length === 0) return NextResponse.json({ ok: true, criadas: 0 });

  // O índice único é parcial (migration 012, só pra tipo='partida_proxima'),
  // e upsert com onConflict não sabe declarar esse WHERE — a Postgres rejeita
  // o ON CONFLICT por não achar constraint correspondente. Checa antes (cobre
  // o caso comum) e insere um por um tolerando 23505 (cobre a corrida real
  // de duas checagens em paralelo — StrictMode, duas abas — que o índice
  // parcial continua garantindo mesmo sem upsert).
  const { data: jaNotificado } = await supabase
    .from('notificacoes')
    .select('game_id')
    .eq('user_id', user.id)
    .eq('tipo', 'partida_proxima')
    .in('game_id', candidatos.map((c) => c.game_id));
  const jaNotificadoSet = new Set((jaNotificado || []).map((n) => n.game_id));
  const faltando = candidatos.filter((c) => !jaNotificadoSet.has(c.game_id));

  let criadas = 0;
  for (const c of faltando) {
    const { error } = await supabase.from('notificacoes').insert({
      user_id: user.id, tipo: 'partida_proxima', game_id: c.game_id, mensagem: `Sua pelada em ${c.games.local} começa em breve!`,
    });
    if (error && error.code !== '23505') return errJson(error.message, 500);
    if (!error) criadas++;
  }

  return NextResponse.json({ ok: true, criadas });
}
