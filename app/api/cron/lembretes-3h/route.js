import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { inicioDoJogo } from '@/lib/gameUtils';
import { notificarPartidasProximas } from '@/lib/lembretesPartida';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const JANELA_MS = 3 * 60 * 60 * 1000; // mesma janela de "em breve" de verificar-proximas

function dataLocalISO(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Versão GLOBAL de verificar-proximas — varre TODO MUNDO com pelada
// aprovada dentro de 3h, em vez de só quem abriu o app. Existe porque o
// aviso de 3h não pode depender só de alguém estar com o app aberto: o
// cron do Vercel (vercel.json) roda 1x/dia no plano Hobby, longe demais
// pra cobrir uma janela de 3h sozinho — quem chamar essa rota de verdade
// é um agendamento EXTERNO gratuito (.github/workflows/lembretes-3h.yml,
// GitHub Actions, roda a cada ~20min) que não tem esse limite de
// frequência. Escreve no MESMO tipo (partida_proxima_3h) que
// verificar-proximas — mesmo dedup, então não importa se o jogador abriu
// o app ou se foi essa varredura que chegou primeiro, nunca dobra o aviso
// nem o e-mail.
export async function GET(request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const { data: jogos } = await supabase
    .from('games')
    .select('id, local, data, horario')
    .in('data', [dataLocalISO(0), dataLocalISO(1)]);

  const agora = Date.now();
  const gameIdsProximos = (jogos || [])
    .filter((g) => g.data && g.horario && (() => { const diff = inicioDoJogo(g).getTime() - agora; return diff >= 0 && diff < JANELA_MS; })())
    .map((g) => g.id);

  if (gameIdsProximos.length === 0) return NextResponse.json({ ok: true, criadas: 0 });

  const { data: confirmacoes } = await supabase
    .from('confirmacoes')
    .select('user_id, game_id, games(local, data, horario)')
    .in('game_id', gameIdsProximos)
    .eq('status', 'aprovado');

  const criadas = await notificarPartidasProximas(
    confirmacoes || [],
    'partida_proxima_3h',
    (c) => `Sua pelada em ${c.games.local} começa em breve!`,
  );
  return NextResponse.json({ ok: true, criadas });
}
