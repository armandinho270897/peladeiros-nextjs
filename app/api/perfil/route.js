import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { todayISO, LIMITE_EM_CIMA_DA_HORA_MS } from '@/lib/gameUtils';

// Peladas em que o mesmo capitão comandou sem cancelamento de última hora
// (ninguém que tinha aprovado cancelou a menos de 3h do início) — critério
// do selo "O Brabo que Comanda".
const BRABO_THRESHOLD = 3;

async function peladasBoasComoCapitao(userId, today) {
  const { data: peladas } = await supabase.from('games').select('id, data, horario').eq('owner_id', userId).lt('data', today);
  if (!peladas || peladas.length === 0) return 0;

  const gameIds = peladas.map((g) => g.id);
  const { data: cancelamentos } = await supabase
    .from('confirmacoes')
    .select('game_id, cancelado_em')
    .in('game_id', gameIds)
    .eq('status', 'cancelado')
    .not('cancelado_em', 'is', null);

  const comProblema = new Set();
  for (const c of cancelamentos || []) {
    const game = peladas.find((g) => g.id === c.game_id);
    if (!game) continue;
    const diff = new Date(`${game.data}T${game.horario}`).getTime() - new Date(c.cancelado_em).getTime();
    if (diff >= 0 && diff < LIMITE_EM_CIMA_DA_HORA_MS) comProblema.add(game.id);
  }
  return peladas.filter((g) => !comProblema.has(g.id)).length;
}

export async function GET() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Complete seu perfil.' }, { status: 400 });

  const today = todayISO();

  const [{ count: peladasConfirmadas }, { count: peladasComoCapitao }, { data: avaliacoesRecebidas }, { data: minhasConfirmacoes }] = await Promise.all([
    supabase.from('confirmacoes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'aprovado'),
    supabase.from('games').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
    supabase.from('avaliacoes').select('nota').eq('avaliado_id', user.id),
    supabase.from('confirmacoes').select('game_id, presente').eq('user_id', user.id).eq('status', 'aprovado'),
  ]);

  const totalAvaliacoes = (avaliacoesRecebidas || []).length;
  const notaMedia = totalAvaliacoes > 0
    ? avaliacoesRecebidas.reduce((s, a) => s + a.nota, 0) / totalAvaliacoes
    : null;

  const presencaPorGameId = {};
  for (const c of minhasConfirmacoes || []) presencaPorGameId[c.game_id] = c.presente;

  const gameIds = (minhasConfirmacoes || []).map((c) => c.game_id);
  let historico = [];
  if (gameIds.length > 0) {
    const { data: games } = await supabase
      .from('games')
      .select('id, local, bairro, data, horario, capitao, encerrada_em')
      .in('id', gameIds)
      .lt('data', today)
      .order('data', { ascending: false })
      .order('horario', { ascending: false });
    // presente=null (pelada ainda não encerrada, sem julgamento do capitão)
    // conta como presença — mesmo benefício da dúvida de lib/ratings.js
    historico = (games || []).map((g) => ({ ...g, presente: presencaPorGameId[g.id] ?? null }));
  }

  const totalPeladasPassadas = historico.length;
  const peladasJogadas = historico.filter((g) => g.presente !== false).length;
  const brabo = await peladasBoasComoCapitao(user.id, today);
  const temAvaliacaoCinco = (avaliacoesRecebidas || []).some((a) => a.nota === 5);

  const conquistas = [
    { id: 'primeira_pelada', titulo: 'Primeira pelada', descricao: 'Jogou a primeira pelada', desbloqueada: peladasJogadas >= 1 },
    { id: 'cinco_peladas', titulo: '5 peladas', descricao: 'Já jogou 5 peladas', desbloqueada: peladasJogadas >= 5 },
    { id: 'dez_peladas', titulo: '10 peladas', descricao: 'Já jogou 10 peladas', desbloqueada: peladasJogadas >= 10 },
    { id: 'avaliacao_cinco', titulo: 'Cinco estrelas', descricao: 'Recebeu uma avaliação 5 estrelas', desbloqueada: temAvaliacaoCinco },
    { id: 'brabo_que_comanda', titulo: 'O Brabo que Comanda', descricao: `Comandou ${BRABO_THRESHOLD} peladas sem perrengue de última hora`, desbloqueada: brabo >= BRABO_THRESHOLD },
  ];

  return NextResponse.json({
    profile,
    stats: { peladasConfirmadas, peladasComoCapitao, notaMedia, totalAvaliacoes, peladasJogadas, totalPeladasPassadas },
    historico,
    conquistas,
  });
}
