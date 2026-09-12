import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { todayISO, LIMITE_EM_CIMA_DA_HORA_MS, checkinPontual } from '@/lib/gameUtils';
import { notaMediaPonderada, calcularMoral } from '@/lib/moral';
import { patenteDe } from '@/lib/patentes';

// Peladas em que o mesmo capitão comandou sem cancelamento de última hora
// (ninguém que tinha aprovado cancelou a menos de 3h do início) — critério
// do selo "O Brabo que Comanda" e do selo "· Capitão" da patente.
const BRABO_THRESHOLD = 3;

// Selo de conduta "Presença de Ferro" — exige volume mínimo de partidas
// COM check-in (não só presença) pra pontualidade ter significado
// estatístico, e um piso alto nos dois percentuais juntos.
const PRESENCA_FERRO_MIN_JOGOS = 10;
const PRESENCA_FERRO_MIN_PERCENT = 90;

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

// Bloco 1 (topo da Home) — solicitações que o usuário, como capitão, ainda
// não respondeu, agrupadas por pelada pra permitir aprovar/rejeitar tudo
// de uma vez direto no card, sem abrir o gerenciador da pelada.
async function aprovacoesPendentes(userId) {
  const { data } = await supabase
    .from('confirmacoes')
    .select('id, game_id, games!inner(id, local, bairro, owner_id)')
    .eq('games.owner_id', userId)
    .eq('status', 'pendente');

  const porGame = {};
  for (const c of data || []) {
    const g = c.games;
    if (!porGame[g.id]) porGame[g.id] = { gameId: g.id, local: g.local, bairro: g.bairro, confirmacaoIds: [] };
    porGame[g.id].confirmacaoIds.push(c.id);
  }
  return Object.values(porGame);
}

// Bloco 1 — a própria vaga do usuário aguardando confirmação antes do prazo
// (2h) passar e ela ir pro próximo do banco. Se houver mais de uma (raro),
// mostra só a mais urgente. Filtra prazo ainda não vencido — sem isso, uma
// vaga cujo prazo já passou (e que só é varrida/expirada de fato quando o
// usuário visita /peladas ou /games) ainda apareceria aqui com um botão
// "Confirmar minha vaga" que já daria 409 ao clicar.
async function vagaAConfirmar(userId) {
  const { data } = await supabase
    .from('confirmacoes')
    .select('id, game_id, prazo_confirmacao, games(local, bairro, data, horario)')
    .eq('user_id', userId)
    .eq('status', 'aguardando_confirmacao')
    .gt('prazo_confirmacao', new Date().toISOString())
    .order('prazo_confirmacao', { ascending: true })
    .limit(1);

  const c = data?.[0];
  if (!c || !c.games) return null;
  return {
    confirmacaoId: c.id,
    gameId: c.game_id,
    local: c.games.local,
    bairro: c.games.bairro,
    data: c.games.data,
    horario: c.games.horario,
    prazoConfirmacao: c.prazo_confirmacao,
  };
}

// Bloco 2 — uma frase só sintetizando a atividade social mais recente da
// semana (não uma lista) — pedidos pra jogar, crescimento do time, ou
// mensagens no chat. Quando mais de um tipo aconteceu na janela, vence o
// mais recente (não soma todos numa frase só).
async function resumoSocial(userId) {
  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from('notificacoes')
    .select('tipo, created_at, ator_user_id')
    .eq('user_id', userId)
    .in('tipo', ['solicitacao_pendente', 'convite_time_aceito', 'pelada_chat'])
    .gte('created_at', seteDiasAtras)
    .order('created_at', { ascending: false })
    .limit(200);

  if (!data || data.length === 0) return null;

  const tipoEscolhido = data[0].tipo;
  const doTipo = data.filter((n) => n.tipo === tipoEscolhido);

  if (tipoEscolhido === 'pelada_chat') {
    const atorIds = [...new Set(doTipo.map((n) => n.ator_user_id).filter(Boolean))];
    if (atorIds.length === 0) return null;
    const { data: perfilAtor } = await supabase.from('profiles').select('nome').eq('id', doTipo[0].ator_user_id).maybeSingle();
    // Sem nome de verdade (perfil apagado, ou nunca preenchido), não dá pra
    // montar a frase "{nome} mandou mensagem..." sem inventar texto novo —
    // melhor não mostrar o bloco nesse evento do que exibir "null" na tela.
    if (!perfilAtor?.nome) return null;
    return { tipo: 'mensagens', quantidade: atorIds.length, nome: perfilAtor.nome };
  }
  if (tipoEscolhido === 'convite_time_aceito') return { tipo: 'time', quantidade: doTipo.length };
  return { tipo: 'pedidos', quantidade: doTipo.length };
}

// Aceita ?userId= pra ver o perfil de OUTRO jogador (read-only) — mesma
// rota, mesma forma de resposta, só que: (1) os 3 blocos "minhas
// pendências"/"meu feed" (aprovacoesPendentes/vagaAConfirmar/resumoSocial)
// só rodam pro dono de verdade (não fazem sentido — e vazariam contexto —
// pro perfil de outra pessoa); (2) whatsapp/notif_prefs somem da resposta
// quando não é o dono (dado de contato/preferência pessoal, não reputação
// pública). RLS de profiles já é pública pra leitura (using(true)) — o
// filtro que importa é esse aqui, não a policy do banco.
export async function GET(request) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get('userId') || user.id;
  const souEu = targetId === user.id;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetId).maybeSingle();
  if (!profile) return NextResponse.json({ error: souEu ? 'Complete seu perfil.' : 'Jogador não encontrado.' }, { status: souEu ? 400 : 404 });

  const today = todayISO();

  const [
    { count: peladasConfirmadas },
    { count: peladasComoCapitao },
    { data: avaliacoesRecebidas },
    { data: minhasConfirmacoes },
    { data: meusTimes },
    acaoAprovacoes,
    acaoVaga,
    resumoSocialEvento,
  ] = await Promise.all([
    supabase.from('confirmacoes').select('id', { count: 'exact', head: true }).eq('user_id', targetId).eq('status', 'aprovado'),
    supabase.from('games').select('id', { count: 'exact', head: true }).eq('owner_id', targetId),
    supabase.from('avaliacoes').select('nota, tipo, tag, fair_play').eq('avaliado_id', targetId),
    supabase.from('confirmacoes').select('game_id, presente, time, checkin_at').eq('user_id', targetId).eq('status', 'aprovado'),
    supabase.from('time_membros').select('papel, times(id, nome, escudo_url, bairro, modalidade)').eq('user_id', targetId).eq('status', 'aprovado'),
    souEu ? aprovacoesPendentes(targetId) : Promise.resolve([]),
    souEu ? vagaAConfirmar(targetId) : Promise.resolve(null),
    souEu ? resumoSocial(targetId) : Promise.resolve(null),
  ]);

  const times = (meusTimes || []).map((m) => ({ ...m.times, papel: m.papel }));

  const totalAvaliacoes = (avaliacoesRecebidas || []).length;
  const notaMedia = notaMediaPonderada(avaliacoesRecebidas);

  // null = avaliador não marcou (checkbox nunca existiu antes dessa
  // feature, ou avaliação 'geral', que não mira ninguém) — não conta pra
  // cima nem pra baixo, só as avaliações com fair_play explícito. Entra na
  // fórmula de Moral (lib/moral.js) com suavização de Laplace — quem ainda
  // não tem avaliação de fair play fica neutro, não prejudicado.
  const avaliacoesComFairPlay = (avaliacoesRecebidas || []).filter((a) => a.fair_play !== null && a.fair_play !== undefined);
  const fairPlaySim = avaliacoesComFairPlay.filter((a) => a.fair_play).length;
  const fairPlayTotal = avaliacoesComFairPlay.length;
  const percentualFairPlay = fairPlayTotal > 0 ? Math.round((fairPlaySim / fairPlayTotal) * 100) : null;

  const presencaPorGameId = {};
  const timePorGameId = {};
  const checkinAtPorGameId = {};
  for (const c of minhasConfirmacoes || []) {
    presencaPorGameId[c.game_id] = c.presente;
    timePorGameId[c.game_id] = c.time;
    checkinAtPorGameId[c.game_id] = c.checkin_at;
  }

  // Resultado (vitória/empate/derrota) só existe quando o jogo teve times
  // A/B montados (MontarTimesModal) E placar registrado — a maioria das
  // peladas soltas nunca tem os dois, então fica null (não aparece nada).
  function resultadoDe(g) {
    const meuTime = timePorGameId[g.id];
    if (!meuTime || g.placar_time_a == null || g.placar_time_b == null) return null;
    const meuPlacar = meuTime === 'A' ? g.placar_time_a : g.placar_time_b;
    const placarAdversario = meuTime === 'A' ? g.placar_time_b : g.placar_time_a;
    if (meuPlacar > placarAdversario) return 'vitoria';
    if (meuPlacar < placarAdversario) return 'derrota';
    return 'empate';
  }

  const gameIds = (minhasConfirmacoes || []).map((c) => c.game_id);
  let historico = [];
  let proximaConfirmada = null;
  if (gameIds.length > 0) {
    const { data: games } = await supabase
      .from('games')
      .select('id, local, bairro, data, horario, capitao, encerrada_em, owner_id, tipo, placar_time_a, placar_time_b')
      .in('id', gameIds);

    const passadas = (games || [])
      .filter((g) => g.data < today)
      .sort((a, b) => (b.data + b.horario).localeCompare(a.data + a.horario));
    // presente=null (pelada ainda não encerrada, sem julgamento do capitão)
    // conta como presença — mesmo benefício da dúvida de lib/ratings.js
    historico = passadas.map((g) => ({ ...g, presente: presencaPorGameId[g.id] ?? null, checkinAt: checkinAtPorGameId[g.id] ?? null, resultado: resultadoDe(g) }));

    // Próxima pelada confirmada (>= hoje) — usada pela Home pra não
    // precisar buscar a lista pública inteira de peladas (/api/games) só
    // pra achar a única que o usuário já confirmou presença.
    proximaConfirmada = (games || [])
      .filter((g) => g.data >= today)
      .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))[0] || null;
  }

  const totalPeladasPassadas = historico.length;
  const peladasJogadas = historico.filter((g) => g.presente !== false).length;
  const brabo = await peladasBoasComoCapitao(targetId, today);
  const ehCapitao = brabo >= BRABO_THRESHOLD;
  const temAvaliacaoCinco = (avaliacoesRecebidas || []).some((a) => a.nota === 5);

  const faltas = await faltasDoUsuario(targetId, historico);

  // Pontualidade: só entra quem tem checkin_at (sinal objetivo de
  // horário); marcação manual sem check-in não tem horário confiável, fica
  // de fora — nem conta a favor nem contra. Entra tanto no stat público
  // quanto na fórmula de Moral (lib/moral.js), com a mesma suavização.
  const historicoComCheckin = historico.filter((g) => g.checkinAt);
  const partidasComCheckin = historicoComCheckin.length;
  const partidasPontuais = historicoComCheckin.filter((g) => checkinPontual(g.checkinAt, g)).length;
  const percentualPontualidade = partidasComCheckin > 0 ? Math.round((partidasPontuais / partidasComCheckin) * 100) : null;

  const moral = calcularMoral({
    notaMedia, presencas: peladasJogadas, faltas, contaCriadaEm: profile.created_at,
    pontuais: partidasPontuais, comCheckin: partidasComCheckin, fairPlaySim, fairPlayTotal,
  });

  const percentualPresenca = totalPeladasPassadas > 0 ? Math.round((peladasJogadas / totalPeladasPassadas) * 100) : null;

  // "Presença de Ferro": conduta, não desempenho — exige volume mínimo de
  // partidas COM check-in (senão pontualidade não tem base estatística) e
  // os dois percentuais (presença geral + pontualidade) acima do piso.
  const presencaDeFerro = partidasComCheckin >= PRESENCA_FERRO_MIN_JOGOS
    && (percentualPresenca ?? 0) >= PRESENCA_FERRO_MIN_PERCENT
    && (percentualPontualidade ?? 0) >= PRESENCA_FERRO_MIN_PERCENT;

  // atual/meta só preenchidos pras conquistas com uma meta numérica clara
  // ("x de y"); pra binárias (avaliacao_cinco) ficam null — ver
  // ConquistasBadges.js, único consumidor hoje (Perfil). "Primeira pelada"/
  // "5 peladas"/"10 peladas" saíram daqui — redundantes com a patente
  // (lib/patentes.js), que já mede exatamente peladas jogadas.
  const conquistas = [
    { id: 'avaliacao_cinco', titulo: 'Cinco estrelas', descricao: 'Recebeu uma avaliação 5 estrelas', desbloqueada: temAvaliacaoCinco, atual: null, meta: null },
    { id: 'brabo_que_comanda', titulo: 'O Brabo que Comanda', descricao: `Comandou ${BRABO_THRESHOLD} peladas sem perrengue de última hora`, desbloqueada: ehCapitao, atual: brabo, meta: BRABO_THRESHOLD },
    {
      id: 'presenca_de_ferro', titulo: 'Presença de Ferro',
      descricao: `Presença e pontualidade acima de ${PRESENCA_FERRO_MIN_PERCENT}% em pelo menos ${PRESENCA_FERRO_MIN_JOGOS} jogos com check-in`,
      desbloqueada: presencaDeFerro, atual: partidasComCheckin, meta: PRESENCA_FERRO_MIN_JOGOS,
    },
  ];

  const patente = patenteDe(peladasJogadas, ehCapitao);

  // Tags são texto livre digitado em cada avaliação (ex: "bom de bola",
  // "Bom De Bola") — agrupa por texto normalizado (trim+minúsculo) pra não
  // espalhar a mesma tag em várias entradas, mas mostra com a capitalização
  // da primeira ocorrência. Só as mais recebidas (top 8) viram selo.
  const contagemTags = new Map();
  for (const a of avaliacoesRecebidas || []) {
    const bruta = (a.tag || '').trim();
    if (!bruta) continue;
    const chave = bruta.toLowerCase();
    const atual = contagemTags.get(chave);
    if (atual) atual.count++;
    else contagemTags.set(chave, { tag: bruta, count: 1 });
  }
  const tags = Array.from(contagemTags.values()).sort((a, b) => b.count - a.count).slice(0, 8);

  return NextResponse.json({
    profile: souEu ? profile : { ...profile, whatsapp: undefined, notif_prefs: undefined },
    souEu,
    stats: {
      peladasConfirmadas,
      peladasComoCapitao,
      notaMedia,
      totalAvaliacoes,
      peladasJogadas,
      totalPeladasPassadas,
      moral,
      percentualPresenca,
      percentualFairPlay,
      percentualPontualidade,
      partidasComCheckin,
    },
    historico,
    conquistas,
    patente,
    tags,
    proximaConfirmada,
    times,
    acaoPendente: { aprovacoes: acaoAprovacoes, vagaConfirmar: acaoVaga },
    resumoSocial: resumoSocialEvento,
  });
}
