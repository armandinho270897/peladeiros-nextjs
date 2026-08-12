import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

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
    const inicio = new Date(`${c.games.data}T${c.games.horario}`).getTime();
    const diff = inicio - agora;
    return diff >= 0 && diff < JANELA_MS;
  });

  if (candidatos.length === 0) return NextResponse.json({ ok: true, criadas: 0 });

  // upsert com ignoreDuplicates: o índice único parcial (migration 012)
  // garante que duas checagens em paralelo (StrictMode, duas abas) não
  // duplicam a notificação — a segunda simplesmente não insere nada.
  const rows = candidatos.map((c) => ({
    user_id: user.id,
    tipo: 'partida_proxima',
    game_id: c.game_id,
    mensagem: `Sua pelada em ${c.games.local} começa em breve!`,
  }));

  const { data: inseridas, error } = await supabase
    .from('notificacoes')
    .upsert(rows, { onConflict: 'user_id,game_id', ignoreDuplicates: true })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, criadas: inseridas?.length || 0 });
}
