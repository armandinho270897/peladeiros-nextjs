import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { todayISO, LIMITE_EM_CIMA_DA_HORA_MS, checkinPontual } from '@/lib/gameUtils';
import { calcularMoral, notaMediaPonderada } from '@/lib/moral';

// Anexa nota_media, moral, modalidade/posicoes, foto_url e peladas_jogadas
// em cada confirmacao, com um punhado de queries agregadas em memória —
// evita N+1 mesmo com várias peladas/confirmados na tela. Usado tanto no
// GET de games quanto no de games/[id], e o resumo (posições/nota/foto/
// histórico) alimenta a lista de solicitações pendentes na tela de
// gerenciar e os avatares no card/escalação.
export async function attachNotaMedia(games) {
  const ids = new Set();
  for (const g of games) {
    for (const c of g.confirmacoes || []) {
      if (c.user_id) ids.add(c.user_id);
    }
  }
  if (ids.size === 0) return games;

  const idsArr = Array.from(ids);
  const today = todayISO();

  const [{ data: avaliacoes }, { data: perfis }, { data: historico }, { data: cancelamentos }] = await Promise.all([
    supabase.from('avaliacoes').select('avaliado_id, nota, tipo, fair_play').in('avaliado_id', idsArr),
    supabase.from('profiles').select('id, modalidade_principal, posicoes, foto_url, created_at').in('id', idsArr),
    supabase.from('confirmacoes').select('user_id, presente, checkin_at, games(data, horario)').eq('status', 'aprovado').in('user_id', idsArr),
    supabase.from('confirmacoes').select('user_id, cancelado_em, games(data, horario)').eq('status', 'cancelado').in('user_id', idsArr).not('cancelado_em', 'is', null),
  ]);

  // agrupa por avaliado_id pra depois calcular a média ponderada (avaliação
  // como capitão pesa mais — RF-005, ver lib/moral.js). 'geral' não mira
  // ninguém (avaliado_id null) e nunca aparece aqui.
  const avaliacoesPorUser = {};
  for (const a of avaliacoes || []) {
    if (!a.avaliado_id) continue;
    (avaliacoesPorUser[a.avaliado_id] ||= []).push(a);
  }

  // fair play: mesmo critério de app/api/perfil/route.js — só conta quem
  // de fato marcou o campo (null = avaliação sem esse campo, tipo 'geral',
  // ou anterior à feature); não entra a favor nem contra.
  const fairPlaySimPorUser = {};
  const fairPlayTotalPorUser = {};
  for (const a of avaliacoes || []) {
    if (!a.avaliado_id || a.fair_play === null || a.fair_play === undefined) continue;
    fairPlayTotalPorUser[a.avaliado_id] = (fairPlayTotalPorUser[a.avaliado_id] || 0) + 1;
    if (a.fair_play) fairPlaySimPorUser[a.avaliado_id] = (fairPlaySimPorUser[a.avaliado_id] || 0) + 1;
  }

  const perfilPorId = {};
  for (const p of perfis || []) perfilPorId[p.id] = p;

  // presença = aprovado numa pelada passada e não marcado ausente pelo
  // capitão no encerramento (presente=null é o caso comum de peladas ainda
  // não encerradas — dá o benefício da dúvida, conta como presença).
  // pontualidade só considera quem tem checkin_at (sinal objetivo de
  // horário) — sem check-in não dá pra dizer se foi pontual ou atrasado.
  const peladasJogadas = {};
  const faltasPorAusencia = {};
  const comCheckinPorUser = {};
  const pontuaisPorUser = {};
  for (const h of historico || []) {
    if (!h.games?.data || h.games.data >= today) continue;
    if (h.presente === false) {
      faltasPorAusencia[h.user_id] = (faltasPorAusencia[h.user_id] || 0) + 1;
    } else {
      peladasJogadas[h.user_id] = (peladasJogadas[h.user_id] || 0) + 1;
    }
    if (h.checkin_at) {
      comCheckinPorUser[h.user_id] = (comCheckinPorUser[h.user_id] || 0) + 1;
      if (checkinPontual(h.checkin_at, h.games)) {
        pontuaisPorUser[h.user_id] = (pontuaisPorUser[h.user_id] || 0) + 1;
      }
    }
  }

  // falta = cancelou uma presença aprovada a menos de 3h do início, OU o
  // capitão marcou como ausente no encerramento formal da pelada.
  const faltas = {};
  for (const c of cancelamentos || []) {
    if (!c.games?.data || !c.games?.horario) continue;
    const diff = new Date(`${c.games.data}T${c.games.horario}`).getTime() - new Date(c.cancelado_em).getTime();
    if (diff >= 0 && diff < LIMITE_EM_CIMA_DA_HORA_MS) {
      faltas[c.user_id] = (faltas[c.user_id] || 0) + 1;
    }
  }
  for (const [userId, count] of Object.entries(faltasPorAusencia)) {
    faltas[userId] = (faltas[userId] || 0) + count;
  }

  return games.map((g) => ({
    ...g,
    confirmacoes: (g.confirmacoes || []).map((c) => {
      const notaMedia = c.user_id ? notaMediaPonderada(avaliacoesPorUser[c.user_id]) : null;
      const presencas = c.user_id ? peladasJogadas[c.user_id] || 0 : 0;
      const faltasDoUser = c.user_id ? faltas[c.user_id] || 0 : 0;
      const perfil = c.user_id ? perfilPorId[c.user_id] : null;
      const moral = c.user_id ? calcularMoral({
        notaMedia, presencas, faltas: faltasDoUser, contaCriadaEm: perfil?.created_at,
        pontuais: pontuaisPorUser[c.user_id] || 0, comCheckin: comCheckinPorUser[c.user_id] || 0,
        fairPlaySim: fairPlaySimPorUser[c.user_id] || 0, fairPlayTotal: fairPlayTotalPorUser[c.user_id] || 0,
      }) : null;
      return {
        ...c,
        nota_media: notaMedia,
        moral,
        modalidade_principal: perfil?.modalidade_principal ?? null,
        posicoes: perfil?.posicoes ?? null,
        foto_url: perfil?.foto_url ?? null,
        peladas_jogadas: presencas,
      };
    }),
  }));
}
