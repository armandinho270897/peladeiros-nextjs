import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';

// Painel do Organizador é sempre autenticado (não existe fallback de PIN
// aqui — isso é só pro fluxo antigo de pelada sem login). Um único helper
// pra pegar a sessão, reaproveitado nas 3 rotas do painel.
export async function getSessionUser() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  return user || null;
}

// Dono estrito da pelada (games.owner_id) — sem o fallback de código (PIN)
// que authorizeGameOwner tem, porque o Painel exige sessão de qualquer
// forma. Peladas legadas sem owner_id (só PIN) não aparecem nem podem ser
// abertas por aqui — continuam só gerenciáveis pelo fluxo de PIN de sempre.
export async function authorizeOrganizerGame(gameId, user) {
  if (!user) return { ok: false, status: 401, error: 'Faça login pra fazer isso.' };
  const { data: game } = await supabase.from('games').select('owner_id').eq('id', gameId).single();
  if (!game) return { ok: false, status: 404, error: 'Pelada não encontrada.' };
  if (!game.owner_id || game.owner_id !== user.id) {
    return { ok: false, status: 403, error: 'Só quem organizou essa pelada pode ver isso.' };
  }
  return { ok: true };
}

// Ids dos times que o usuário capitaneia (aprovado) — usado pra puxar
// resumo financeiro de mensalidades no painel.
export async function timesQueCapitaneia(userId) {
  const { data } = await supabase
    .from('time_membros')
    .select('time_id')
    .eq('user_id', userId)
    .eq('papel', 'capitao')
    .eq('status', 'aprovado');
  return (data || []).map((m) => m.time_id);
}
