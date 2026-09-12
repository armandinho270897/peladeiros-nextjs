import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { inicioDoJogo, checkinJanelaAberta, CHECKIN_TOLERANCIA_MS } from '@/lib/gameUtils';
import { notificarPartidasProximas } from '@/lib/lembretesPartida';

const JANELA_MS = 3 * 60 * 60 * 1000; // "em breve" = começa dentro de 3h

// Chamada quando o app abre (ver AuthProvider.js) — não é push, é só uma
// checagem local que cria a notificação na hora se ainda não existir uma
// igual, então não duplica a cada abertura. Não é a ÚNICA via desse aviso:
// app/api/cron/lembretes-3h/route.js varre TODO MUNDO nessa mesma janela,
// chamado por fora (GitHub Actions, a cada ~20min) — cobre quem não abre o
// app. As duas escrevem o mesmo tipo (partida_proxima_3h), então dividem o
// mesmo dedup: não importa qual chega primeiro, nunca duplica.
export async function POST() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  if (!checkRateLimit(`verificar-proximas:${user.id}`)) {
    return NextResponse.json({ ok: true, criadas: 0 });
  }

  const { data: confirmacoes } = await supabase
    .from('confirmacoes')
    .select('game_id, checkin_at, games(id, local, data, horario, encerrada_em)')
    .eq('user_id', user.id)
    .eq('status', 'aprovado');

  const agora = Date.now();
  const candidatos = (confirmacoes || []).filter((c) => {
    if (!c.games?.data || !c.games?.horario) return false;
    const diff = inicioDoJogo(c.games).getTime() - agora;
    return diff >= 0 && diff < JANELA_MS;
  });

  const criadas = await notificarPartidasProximas(
    candidatos.map((c) => ({ ...c, user_id: user.id })),
    'partida_proxima_3h',
    (c) => `Sua pelada em ${c.games.local} começa em breve!`,
  );

  // Lembrete de check-in: só quem ainda não chegou, dentro da janela de
  // check-in aberta até a tolerância de pontualidade — depois disso o
  // lembrete não ajuda mais (a pessoa já tá atrasada ou não vem).
  const candidatosCheckin = (confirmacoes || []).filter((c) => {
    if (!c.games?.data || !c.games?.horario || c.games.encerrada_em || c.checkin_at) return false;
    if (!checkinJanelaAberta(c.games)) return false;
    return agora <= inicioDoJogo(c.games).getTime() + CHECKIN_TOLERANCIA_MS;
  });
  const criadasCheckin = await notificarPartidasProximas(
    candidatosCheckin.map((c) => ({ ...c, user_id: user.id })),
    'checkin_lembrete',
    (c) => `Já chegou em ${c.games.local}? Faz o check-in pra registrar sua presença.`,
  );

  return NextResponse.json({ ok: true, criadas: criadas + criadasCheckin });
}
