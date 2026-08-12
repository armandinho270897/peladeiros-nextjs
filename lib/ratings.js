import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { todayISO } from '@/lib/gameUtils';

// Anexa nota_media, posicao e peladas_jogadas em cada confirmacao, com um
// punhado de queries agregadas em memória — evita N+1 mesmo com várias
// peladas/confirmados na tela. Usado tanto no GET de games quanto no de
// games/[id], e o resumo (posicao/nota/histórico) alimenta a lista de
// solicitações pendentes na tela de gerenciar.
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

  const [{ data: avaliacoes }, { data: perfis }, { data: historico }] = await Promise.all([
    supabase.from('avaliacoes').select('avaliado_id, nota').in('avaliado_id', idsArr),
    supabase.from('profiles').select('id, posicao').in('id', idsArr),
    supabase.from('confirmacoes').select('user_id, games(data)').eq('status', 'aprovado').in('user_id', idsArr),
  ]);

  const somas = {};
  const contagens = {};
  for (const a of avaliacoes || []) {
    somas[a.avaliado_id] = (somas[a.avaliado_id] || 0) + a.nota;
    contagens[a.avaliado_id] = (contagens[a.avaliado_id] || 0) + 1;
  }

  const posicaoPorId = {};
  for (const p of perfis || []) posicaoPorId[p.id] = p.posicao;

  const peladasJogadas = {};
  for (const h of historico || []) {
    if (h.games?.data && h.games.data < today) {
      peladasJogadas[h.user_id] = (peladasJogadas[h.user_id] || 0) + 1;
    }
  }

  return games.map((g) => ({
    ...g,
    confirmacoes: (g.confirmacoes || []).map((c) => ({
      ...c,
      nota_media: c.user_id && contagens[c.user_id] ? somas[c.user_id] / contagens[c.user_id] : null,
      posicao: c.user_id ? posicaoPorId[c.user_id] ?? null : null,
      peladas_jogadas: c.user_id ? peladasJogadas[c.user_id] || 0 : 0,
    })),
  }));
}
