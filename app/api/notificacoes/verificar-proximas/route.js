import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { inicioDoJogo } from '@/lib/gameUtils';
import { notificarPartidasProximas } from '@/lib/lembretesPartida';

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

  const criadas = await notificarPartidasProximas(candidatos.map((c) => ({ ...c, user_id: user.id })));
  return NextResponse.json({ ok: true, criadas });
}
