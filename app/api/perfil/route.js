import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { todayISO, LIMITE_EM_CIMA_DA_HORA_MS } from '@/lib/gameUtils';
import { notaMediaPonderada, calcularMoral } from '@/lib/moral';

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

// Mesmo critério de "falta" usado em lib/ratings.js (attachNotaMedia) pro
// selo de moral que aparece nos avatares de outros jogadores — reaplicado
// aqui pro próprio dono do perfil, pra "moral" significar a mesma coisa
// nos dois lugares. IMPORTANTE: busca por user_id direto, sem restringir
// a game_id de confirmações aprovadas — uma confirmação cancelada nunca
// tem status 'aprovado' ao mesmo tempo (mesma linha, um constraint
// unique(game_id,user_id) só permite um status por vez), então filtrar
// pelos game_ids do histórico (que só tem aprovadas) nunca bateria com
// nenhum cancelamento — ficaria sempre zero, por construção.
async function faltasDoUsuario(userId, historico) {
  const { data: cancelamentos } = await supabase
    .from('confirmacoes')
    .select('cancelado_em, games(data, horario)')
    .eq('user_id', userId)
    .eq('status', 'cancelado')
    .not('cancelado_em', 'is', null);

  let faltas = historico.filter((g) => g.presente === false).length;
  for (const c of cancelamentos || []) {
    if (!c.games?.data || !c.games?.horario) continue;
    const diff = new Date(`${c.games.data}T${c.games.horario}`).getTime() - new Date(c.cancelado_em).getTime();
    if (diff >= 0 && diff < LIMITE_EM_CIMA_DA_HORA_MS) faltas += 1;
  }
  return faltas;
}

export async function GET() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Complete seu perfil.' }, { status: 400 });

  const today = todayISO();

  const [{ count: peladasConfirmadas }, { count: peladasComoCapitao }, { data: avaliacoesRecebidas }, { data: minhasConfirmacoes }, { data: meusTimes }] = await Promise.all([
    supabase.from('confirmacoes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'aprovado'),
    supabase.from('games').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
    supabase.from('avaliacoes').select('nota, tipo').eq('avaliado_id', user.id),
    supabase.from('confirmacoes').select('game_id, presente').eq('user_id', user.id).eq('status', 'aprovado'),
    supabase.from('time_membros').select('papel, times(id, nome, escudo_url, bairro, modalidade)').eq('user_id', user.id).eq('status', 'aprovado'),
  ]);

  const times = (meusTimes || []).map((m) => ({ ...m.times, papel: m.papel }));

  const totalAvaliacoes = (avaliacoesRecebidas || []).length;
  const notaMedia = notaMediaPonderada(avaliacoesRecebidas);

  const presencaPorGameId = {};
  for (const c of minhasConfirmacoes || []) presencaPorGameId[c.game_id] = c.presente;

  const gameIds = (minhasConfirmacoes || []).map((c) => c.game_id);
  let historico = [];
  let proximaConfirmada = null;
  if (gameIds.length > 0) {
    const { data: games } = await supabase
      .from('games')
      .select('id, local, bairro, data, horario, capitao, encerrada_em, owner_id, tipo')
      .in('id', gameIds);

    const passadas = (games || [])
      .filter((g) => g.data < today)
      .sort((a, b) => (b.data + b.horario).localeCompare(a.data + a.horario));
    // presente=null (pelada ainda não encerrada, sem julgamento do capitão)
    // conta como presença — mesmo benefício da dúvida de lib/ratings.js
    historico = passadas.map((g) => ({ ...g, presente: presencaPorGameId[g.id] ?? null }));

    // Próxima pelada confirmada (>= hoje) — usada pela Home pra não
    // precisar buscar a lista pública inteira de peladas (/api/games) só
    // pra achar a única que o usuário já confirmou presença.
    proximaConfirmada = (games || [])
      .filter((g) => g.data >= today)
      .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))[0] || null;
  }

  const totalPeladasPassadas = historico.length;
  const peladasJogadas = historico.filter((g) => g.presente !== false).length;
  const brabo = await peladasBoasComoCapitao(user.id, today);
  const temAvaliacaoCinco = (avaliacoesRecebidas || []).some((a) => a.nota === 5);

  const faltas = await faltasDoUsuario(user.id, historico);
  const moral = calcularMoral({ notaMedia, presencas: peladasJogadas, faltas, contaCriadaEm: profile.created_at });

  // atual/meta só preenchidos pras conquistas com uma meta numérica clara
  // ("x de y"); pra binárias (avaliacao_cinco) ficam null e a Home mostra
  // só o nome, sem barra — ver HomeFeed.js.
  const conquistas = [
    { id: 'primeira_pelada', titulo: 'Primeira pelada', descricao: 'Jogou a primeira pelada', desbloqueada: peladasJogadas >= 1, atual: peladasJogadas, meta: 1 },
    { id: 'cinco_peladas', titulo: '5 peladas', descricao: 'Já jogou 5 peladas', desbloqueada: peladasJogadas >= 5, atual: peladasJogadas, meta: 5 },
    { id: 'dez_peladas', titulo: '10 peladas', descricao: 'Já jogou 10 peladas', desbloqueada: peladasJogadas >= 10, atual: peladasJogadas, meta: 10 },
    { id: 'avaliacao_cinco', titulo: 'Cinco estrelas', descricao: 'Recebeu uma avaliação 5 estrelas', desbloqueada: temAvaliacaoCinco, atual: null, meta: null },
    { id: 'brabo_que_comanda', titulo: 'O Brabo que Comanda', descricao: `Comandou ${BRABO_THRESHOLD} peladas sem perrengue de última hora`, desbloqueada: brabo >= BRABO_THRESHOLD, atual: brabo, meta: BRABO_THRESHOLD },
  ];

  // Próxima conquista ainda não desbloqueada, na ordem acima — usada na
  // barra de progresso da Home.
  const proximaBloqueada = conquistas.find((c) => !c.desbloqueada);
  const proximaConquista = proximaBloqueada
    ? { titulo: proximaBloqueada.titulo, descricao: proximaBloqueada.descricao, atual: proximaBloqueada.atual, meta: proximaBloqueada.meta }
    : null;

  return NextResponse.json({
    profile,
    stats: { peladasConfirmadas, peladasComoCapitao, notaMedia, totalAvaliacoes, peladasJogadas, totalPeladasPassadas, moral },
    historico,
    conquistas,
    proximaConquista,
    proximaConfirmada,
    times,
  });
}
