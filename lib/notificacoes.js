// Busca notificações + perfis dos "atores" (quem praticou a ação, quando
// aplicável) num lugar só — usado tanto por /avisos (lista completa) quanto
// pelo feed resumido da Home, pra não duplicar a mesma query com uma
// variação sutil em cada tela.
export async function fetchNotificacoesComAtores(supabase, userId, limit = 60) {
  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { notificacoes: [], atores: {}, error };

  const rows = data || [];
  const atorIds = [...new Set(rows.map((n) => n.ator_user_id).filter(Boolean))];
  let atores = {};
  if (atorIds.length > 0) {
    const { data: perfis } = await supabase.from('profiles').select('id, nome, foto_url').in('id', atorIds);
    atores = Object.fromEntries((perfis || []).map((p) => [p.id, p]));
  }
  return { notificacoes: rows, atores, error: null };
}

// "há N min/h/d" — usado tanto pelo card de /avisos quanto pelo feed
// resumido da Home, num lugar só pra não desalinhar o texto entre os dois.
export function tempoRelativo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}
