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

// Versão GLOBAL de verificar-proximas — aquela roda por usuário, só quando
// ele abre o app (não alcança quem não abriu). Essa varre TODO MUNDO com
// pelada aprovada nas próximas 3h, disparada pelo Vercel Cron (vercel.json)
// em vez de por uma sessão de navegador. Protegida por CRON_SECRET: o
// Vercel manda esse header sozinho em toda invocação de cron job — sem essa
// env var configurada, a rota fica aberta (aceitável em dev, configure em
// produção).
export async function GET(request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  // Só busca jogos de hoje/amanhã (cobre virada de dia perto da meia-noite)
  // em vez de escanear toda a tabela — um jogo dentro da janela de 3h só
  // pode cair numa dessas duas datas.
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

  const criadas = await notificarPartidasProximas(confirmacoes || []);
  return NextResponse.json({ ok: true, criadas });
}
