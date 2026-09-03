import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { todayISO, LIMITE_EM_CIMA_DA_HORA_MS } from '@/lib/gameUtils';
import { notaMediaPonderada, calcularMoral } from '@/lib/moral';
import { patenteDe } from '@/lib/patentes';

// Peladas em que o mesmo capitão comandou sem cancelamento de última hora
// (ninguém que tinha aprovado cancelou a menos de 3h do início) — critério
// do selo "O Brabo que Comanda" e do selo "· Capitão" da patente.
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
    supabase.from('avaliacoes').select('nota, tipo').eq('avaliado_id', targetId),
    supabase.from('confirmacoes').select('game_id, presente').eq('user_id', targetId).eq('status', 'aprovado'),
    supabase.from('time_membros').select('papel, times(id, nome, escudo_url, bairro, modalidade)').eq('user_id', targetId).eq('status', 'aprovado'),
    souEu ? aprovacoesPendentes(targetId) : Promise.resolve([]),
    souEu ? vagaAConfirmar(targetId) : Promise.resolve(null),
    souEu ? resumoSocial(targetId) : Promise.resolve(null),
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
  const brabo = await peladasBoasComoCapitao(targetId, today);
  const ehCapitao = brabo >= BRABO_THRESHOLD;
  const temAvaliacaoCinco = (avaliacoesRecebidas || []).some((a) => a.nota === 5);

  const faltas = await faltasDoUsuario(targetId, historico);
  const moral = calcularMoral({ notaMedia, presencas: peladasJogadas, faltas, contaCriadaEm: profile.created_at });

  // atual/meta só preenchidos pras conquistas com uma meta numérica clara
  // ("x de y"); pra binárias (avaliacao_cinco) ficam null — ver
  // ConquistasBadges.js, único consumidor hoje (Perfil).
  const conquistas = [
    { id: 'primeira_pelada', titulo: 'Primeira pelada', descricao: 'Jogou a primeira pelada', desbloqueada: peladasJogadas >= 1, atual: peladasJogadas, meta: 1 },
    { id: 'cinco_peladas', titulo: '5 peladas', descricao: 'Já jogou 5 peladas', desbloqueada: peladasJogadas >= 5, atual: peladasJogadas, meta: 5 },
    { id: 'dez_peladas', titulo: '10 peladas', descricao: 'Já jogou 10 peladas', desbloqueada: peladasJogadas >= 10, atual: peladasJogadas, meta: 10 },
    { id: 'avaliacao_cinco', titulo: 'Cinco estrelas', descricao: 'Recebeu uma avaliação 5 estrelas', desbloqueada: temAvaliacaoCinco, atual: null, meta: null },
    { id: 'brabo_que_comanda', titulo: 'O Brabo que Comanda', descricao: `Comandou ${BRABO_THRESHOLD} peladas sem perrengue de última hora`, desbloqueada: ehCapitao, atual: brabo, meta: BRABO_THRESHOLD },
  ];

  const patente = patenteDe(peladasJogadas, ehCapitao);

  return NextResponse.json({
    profile: souEu ? profile : { ...profile, whatsapp: undefined, notif_prefs: undefined },
    souEu,
    stats: { peladasConfirmadas, peladasComoCapitao, notaMedia, totalAvaliacoes, peladasJogadas, totalPeladasPassadas, moral },
    historico,
    conquistas,
    patente,
    proximaConfirmada,
    times,
    acaoPendente: { aprovacoes: acaoAprovacoes, vagaConfirmar: acaoVaga },
    resumoSocial: resumoSocialEvento,
  });
}
