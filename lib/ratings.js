import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Anexa nota_media (ou null) em cada confirmacao, com uma única query extra
// agregada em memória — evita N+1 mesmo com várias peladas/confirmados na tela.
export async function attachNotaMedia(games) {
  const ids = new Set();
  for (const g of games) {
    for (const c of g.confirmacoes || []) {
      if (c.user_id) ids.add(c.user_id);
    }
  }
  if (ids.size === 0) return games;

  const { data: avaliacoes } = await supabase
    .from('avaliacoes')
    .select('avaliado_id, nota')
    .in('avaliado_id', Array.from(ids));

  const somas = {};
  const contagens = {};
  for (const a of avaliacoes || []) {
    somas[a.avaliado_id] = (somas[a.avaliado_id] || 0) + a.nota;
    contagens[a.avaliado_id] = (contagens[a.avaliado_id] || 0) + 1;
  }

  return games.map((g) => ({
    ...g,
    confirmacoes: (g.confirmacoes || []).map((c) => ({
      ...c,
      nota_media: c.user_id && contagens[c.user_id] ? somas[c.user_id] / contagens[c.user_id] : null,
    })),
  }));
}
