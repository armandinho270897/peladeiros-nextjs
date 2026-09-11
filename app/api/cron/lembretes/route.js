import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { inicioDoJogo } from '@/lib/gameUtils';
import { notificarPartidasProximas } from '@/lib/lembretesPartida';

// O cron roda 1x/dia (plano Hobby), então "chega dentro de 24h" não é o
// mesmo que "faltam exatamente 24h" — pode pegar uma pelada faltando só
// 5h se o cron rodar de manhã e o jogo for à tarde. A mensagem usa a
// contagem real de horas em vez de fixar "24h" pra não mentir pro
// jogador sobre quanto tempo ele realmente tem.
function horasRestantes(game) {
  const diffMs = inicioDoJogo(game).getTime() - Date.now();
  return Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
}

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// O plano Hobby do Vercel só permite cron rodando 1x/dia (ver vercel.json —
// "0 11 * * *", 8h em Brasília) — bem diferente da janela de 3h de
// verificar-proximas, que roda a cada abertura do app. Pra não perder quase
// todo mundo (rodando 1x/dia, uma janela de 3h só pegaria quem por acaso
// joga muito perto das 8h), essa janela é bem mais larga: cobre qualquer
// pelada aprovada que ainda vai rolar nas próximas 24h. Quem abre o app
// continua recebendo o aviso mais em cima da hora via verificar-proximas —
// esse cron é só o backstop pra quem não abre.
const JANELA_MS = 24 * 60 * 60 * 1000;

function dataLocalISO(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Versão GLOBAL de verificar-proximas — aquela roda por usuário, só quando
// ele abre o app (não alcança quem não abriu). Essa varre TODO MUNDO com
// pelada aprovada dentro da janela, disparada pelo Vercel Cron (vercel.json)
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

  // Busca jogos de hoje/amanhã/depois de amanhã — cobre a janela de 24h
  // partindo de qualquer horário do dia em que o cron rodar.
  const { data: jogos } = await supabase
    .from('games')
    .select('id, local, data, horario')
    .in('data', [dataLocalISO(0), dataLocalISO(1), dataLocalISO(2)]);

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
    'partida_proxima_24h',
    (c) => `Sua pelada em ${c.games.local} é em ${horasRestantes(c.games)}h — já dá pra se organizar!`,
  );
  return NextResponse.json({ ok: true, criadas });
}
