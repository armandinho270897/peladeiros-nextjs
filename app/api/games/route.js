import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { attachNotaMedia } from '@/lib/ratings';
import { createNotification } from '@/lib/notify';
import { sweepExpiredConfirmacoes } from '@/lib/confirmacoesExpiry';
import { errJson } from '@/lib/apiError';
import { todayISO, addDiasISO, fimDeSemanaRange, periodoDe, ocupandoVagaDe, haversineKm, MODALIDADE_LABEL } from '@/lib/gameUtils';

// Bug real encontrado em produção: esse GET (supabaseAdmin, sem leitura de
// cookie) tem o mesmo formato de risco que já pegou /api/games/mapa — o
// Data Cache do Next pra chamadas fetch (usadas pelo supabase-js por
// baixo) pode servir uma resposta cacheada antiga entre deploys, mesmo o
// endpoint sendo classificado como dinâmico. Esse aqui é o mais crítico
// dos três: é a lista principal de peladas, carregada em quase toda
// abertura do app.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const LIMITE_PADRAO = 60;
const LIMITE_MAXIMO = 100;

function statusDaOcupacao(g) {
  const restantes = Math.max(0, g.vagas_totais - ocupandoVagaDe(g).length);
  return { restantes, lotado: restantes === 0 };
}

// "Recomendadas" sem IA paga: pontuação simples e explicável a partir do
// que já existe hoje — distância (se a pessoa compartilhou localização),
// modalidade do perfil, vagas disponíveis e proximidade da data. Não usa
// "nível preferido" nem "horário preferido" porque profiles não guarda
// nenhum dos dois hoje (só modalidade_principal/posicoes/bairro) — inventar
// essas colunas só pra essa pontuação seria a "mudança grande no banco"
// que o briefing pediu pra evitar; documentado como limitação no lugar de
// fingir uma correspondência que não existe.
function pontuarRecomendacao(g, { latNum, lngNum, modalidadeLabel, hojeISO }) {
  let score = 0;
  let motivo = null;

  if (latNum != null && g.latitude != null && g.longitude != null) {
    const dist = haversineKm(latNum, lngNum, Number(g.latitude), Number(g.longitude));
    score += Math.max(0, 15 - dist);
    if (dist <= 8) motivo = `A ${dist < 1 ? 'menos de 1' : dist.toFixed(0)} km de você`;
  }

  const modalidadeCombina = modalidadeLabel && g.tipo && g.tipo.toLowerCase() === modalidadeLabel.toLowerCase();
  if (modalidadeCombina) {
    score += 8;
    if (!motivo) motivo = 'Combina com sua modalidade';
  }

  const { restantes, lotado } = statusDaOcupacao(g);
  if (!lotado) score += Math.min(restantes, 5);

  if (!motivo && g.data === hojeISO) {
    motivo = periodoDe(g.horario) === 'noite' ? 'Começa hoje à noite' : 'Começa hoje';
  }
  const diasAteJogo = (new Date(g.data) - new Date(hojeISO)) / 86400000;
  score += Math.max(0, 6 - diasAteJogo);

  return { score, motivo };
}

export async function GET(request) {
  await sweepExpiredConfirmacoes();

  const { searchParams } = new URL(request.url);
  const bairro = searchParams.get('bairro') || '';
  const dataFiltro = searchParams.get('data') || '';
  const periodo = searchParams.get('periodo') || '';
  const tipo = searchParams.get('tipo') || '';
  const nivel = searchParams.get('nivel') || '';
  const precoMaxParam = searchParams.get('precoMax');
  const vagasFiltro = searchParams.get('vagas') || '';
  const somenteTimes = searchParams.get('somenteTimes') === '1';
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const raioKmParam = searchParams.get('raioKm');
  const ordenar = searchParams.get('ordenar') || '';
  const limit = Math.min(Number(searchParams.get('limit')) || LIMITE_PADRAO, LIMITE_MAXIMO);

  const hojeISO = todayISO();
  let query = supabase.from('games').select('*, confirmacoes(*), arenas(nome, foto_url)');

  if (bairro) query = query.eq('bairro', bairro);
  if (tipo) query = query.eq('tipo', tipo);
  if (nivel) query = query.eq('nivel', nivel);

  if (dataFiltro === 'hoje') {
    query = query.eq('data', hojeISO);
  } else if (dataFiltro === 'amanha') {
    query = query.eq('data', addDiasISO(hojeISO, 1));
  } else if (dataFiltro === 'fimDeSemana') {
    const { inicio, fim } = fimDeSemanaRange(hojeISO);
    query = query.gte('data', inicio).lte('data', fim);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dataFiltro)) {
    query = query.eq('data', dataFiltro);
  } else if (searchParams.get('escopo') === 'descobrir') {
    // Só restringe a "só o futuro" quando a chamada vem da tela de
    // Descoberta (marcador explícito `escopo=descobrir`, sempre mandado
    // por app/peladas/page.js mesmo com todo o resto do filtro vazio) —
    // sem esse marcador, "Descobrir" sem nenhum filtro ativo mandava a
    // MESMA query vazia que o fetch legado de "Minhas peladas" e caía
    // nesse branch por acidente, ou não caía nunca (dependendo de como a
    // ausência de filtro era detectada) e mostrava peladas passadas. O
    // chamador que não manda NENHUM param (comportamento original, ex.: a
    // aba "Minhas peladas" reaproveitando o mesmo fetch) continua
    // recebendo a lista inteira, passado incluso, como sempre foi.
    query = query.gte('data', hojeISO);
  }

  query = query.order('data', { ascending: true }).order('horario', { ascending: true });

  const { data: games, error } = await query;
  if (error) return errJson(error.message, 500);

  let comNotas = await attachNotaMedia(games);

  if (periodo) comNotas = comNotas.filter((g) => periodoDe(g.horario) === periodo);

  if (precoMaxParam) {
    const precoMax = Number(precoMaxParam);
    if (!Number.isNaN(precoMax)) comNotas = comNotas.filter((g) => g.valor == null || Number(g.valor) <= precoMax);
  }

  if (vagasFiltro) {
    comNotas = comNotas.filter((g) => {
      const { restantes, lotado } = statusDaOcupacao(g);
      if (vagasFiltro === 'comVagas') return !lotado;
      if (vagasFiltro === 'ultimasVagas') return !lotado && restantes <= 3;
      if (vagasFiltro === 'espera') return lotado;
      return true;
    });
  }

  if (somenteTimes) {
    const { data: desafiosRows } = await supabase.from('desafios').select('game_id').not('game_id', 'is', null);
    const idsDeTimes = new Set((desafiosRows || []).map((d) => d.game_id));
    comNotas = comNotas.filter((g) => idsDeTimes.has(g.id));
  }

  // Distância só entra na resposta quando a chamada mandou lat/lng — a
  // ausência de geolocalização (usuário negou, navegador sem suporte)
  // nunca pode quebrar a busca, só faz esses dois campos ficarem null.
  const lat = latParam != null && latParam !== '' ? Number(latParam) : null;
  const lng = lngParam != null && lngParam !== '' ? Number(lngParam) : null;
  const temLocalizacao = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

  comNotas = comNotas.map((g) => ({
    ...g,
    distanciaKm: temLocalizacao && g.latitude != null && g.longitude != null
      ? haversineKm(lat, lng, Number(g.latitude), Number(g.longitude))
      : null,
  }));

  if (temLocalizacao && raioKmParam) {
    const raioKm = Number(raioKmParam);
    if (!Number.isNaN(raioKm)) comNotas = comNotas.filter((g) => g.distanciaKm != null && g.distanciaKm <= raioKm);
  }

  if (ordenar === 'recomendadas') {
    const authClient = createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    let modalidadeLabel = null;
    let idsExcluir = new Set();
    if (user) {
      const [{ data: profile }, { data: minhasConfirmacoes }] = await Promise.all([
        supabase.from('profiles').select('modalidade_principal').eq('id', user.id).maybeSingle(),
        supabase.from('confirmacoes').select('game_id').eq('user_id', user.id),
      ]);
      modalidadeLabel = profile?.modalidade_principal ? MODALIDADE_LABEL[profile.modalidade_principal] : null;
      idsExcluir = new Set((minhasConfirmacoes || []).map((c) => c.game_id));
    }
    comNotas = comNotas
      .filter((g) => !idsExcluir.has(g.id))
      .map((g) => ({ ...g, ...pontuarRecomendacao(g, { latNum: lat, lngNum: lng, modalidadeLabel, hojeISO }) }))
      .sort((a, b) => b.score - a.score);
  } else if (ordenar === 'perto') {
    comNotas = [...comNotas].sort((a, b) => {
      if (a.distanciaKm == null) return 1;
      if (b.distanciaKm == null) return -1;
      return a.distanciaKm - b.distanciaKm;
    });
  } else if (ordenar === 'vagas') {
    comNotas = [...comNotas].sort((a, b) => statusDaOcupacao(b).restantes - statusDaOcupacao(a).restantes);
  } else if (ordenar === 'preco') {
    comNotas = [...comNotas].sort((a, b) => {
      const pa = a.valor == null ? -1 : Number(a.valor); // grátis primeiro
      const pb = b.valor == null ? -1 : Number(b.valor);
      return pa - pb;
    });
  }
  // 'comeca' (ou nenhum ordenar) mantém a ordem já vinda do .order() acima.

  const total = comNotas.length;
  const limitada = comNotas.slice(0, limit);

  // não devolve o código (PIN) pro front — só é usado server-side pra validar edição
  const safe = limitada.map(({ codigo, ...g }) => g);
  return NextResponse.json({ games: safe, total });
}

export async function POST(request) {
  if (!checkRateLimit(`games:create:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas peladas criadas em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra criar uma pelada.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('nome, whatsapp, bairro').eq('id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Complete seu perfil antes de criar uma pelada.' }, { status: 400 });

  const body = await request.json();
  const { local, bairro, data, horario, vagasTotais, latitude, longitude, arenaId, jogadoresIniciais, tipo, nivel, valor, regras } = body;

  if (!local || !bairro || !data || !horario || !vagasTotais) {
    return NextResponse.json({ error: 'Dados inválidos. Confere se preencheu tudo.' }, { status: 400 });
  }

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      local, bairro, data, horario, vagas_totais: vagasTotais,
      capitao: profile.nome,
      owner_id: user.id,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      arena_id: arenaId ?? null,
      tipo: tipo ?? null,
      nivel: nivel ?? null,
      valor: valor ?? null,
      regras: regras ?? null,
    })
    .select()
    .single();

  if (error) return errJson(error.message, 500);

  const idsRegistrados = Array.isArray(jogadoresIniciais)
    ? [...new Set(jogadoresIniciais.map((j) => j.id).filter((id) => id && id !== user.id))]
    : [];

  // O capitão sempre entra confirmado na própria pelada, sem passar pelo
  // fluxo de solicitação/aprovação (ele não vai aprovar a presença dele
  // mesmo) — ocupa uma vaga de vagas_totais como qualquer outro jogador.
  // Roda junto com a busca de perfis dos jogadoresIniciais (não há
  // dependência entre as duas). Reaplicado em 2026-08-30 depois de um
  // revert anterior (commit 52ab221) sem registro do motivo — se esse
  // insert voltar a causar problema, a suspeita nº 1 é o -1 na conta de
  // vagas logo abaixo, não este insert em si.
  const [{ error: confirmacaoCapitaoError }, { data: perfis }] = await Promise.all([
    supabase.from('confirmacoes').insert({
      game_id: game.id, user_id: user.id, nome: profile.nome, whatsapp: profile.whatsapp, bairro: profile.bairro, status: 'aprovado',
    }),
    idsRegistrados.length > 0
      ? supabase.from('profiles').select('id, nome, whatsapp, bairro').in('id', idsRegistrados)
      : Promise.resolve({ data: [] }),
  ]);
  if (confirmacaoCapitaoError) Sentry.captureException(new Error(`confirmação do capitão falhou: ${confirmacaoCapitaoError.message}`));

  // jogadores adicionados direto na criação entram como aprovado (dentro da
  // capacidade) ou espera (se estourar) — mesmo critério do fluxo de aprovar.
  // Convidados sem conta (só nome, sem id) entram do mesmo jeito, sem user_id.
  // Uma vaga já é do capitão, então a capacidade restante pra eles é vagasTotais - 1.
  if (Array.isArray(jogadoresIniciais) && jogadoresIniciais.length > 0) {
    const perfilPorId = {};
    for (const p of perfis || []) perfilPorId[p.id] = p;

    // mantém a ordem escolhida na tela (importa pra decidir quem entra aprovado vs espera)
    const rows = [];
    let i = 0;
    for (const j of jogadoresIniciais) {
      if (j.id === user.id) continue;
      const status = i < vagasTotais - 1 ? 'aprovado' : 'espera';
      if (j.id) {
        const p = perfilPorId[j.id];
        if (!p) continue;
        rows.push({ game_id: game.id, user_id: p.id, nome: p.nome, whatsapp: p.whatsapp, bairro: p.bairro, status });
      } else if (j.nome?.trim()) {
        rows.push({ game_id: game.id, user_id: null, nome: j.nome.trim(), whatsapp: '', bairro: null, status });
      } else {
        continue;
      }
      i++;
    }
    if (rows.length > 0) await supabase.from('confirmacoes').insert(rows);
  }

  // avisa quem tem o mesmo bairro no perfil que tem pelada nova por perto
  const { data: vizinhos } = await supabase.from('profiles').select('id').eq('bairro', bairro).neq('id', user.id);
  for (const v of vizinhos || []) {
    await createNotification({
      userId: v.id,
      tipo: 'pelada_nova_perto',
      gameId: game.id,
      mensagem: `Pelada nova em ${bairro}: ${local}, ${data} às ${horario}.`,
    });
  }

  const { codigo: _omit, ...safe } = game;
  return NextResponse.json(safe, { status: 201 });
}
