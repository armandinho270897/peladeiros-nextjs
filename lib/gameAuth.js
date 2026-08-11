import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';

// Peladas com owner_id (criadas com login) só são mexidas por quem é dono da sessão.
// Peladas antigas (owner_id nulo) continuam caindo no fallback do PIN de 4 dígitos.
// Usado tanto pra editar/cancelar a pelada quanto pra aprovar/rejeitar confirmações —
// quem pode uma coisa, pode a outra.
export async function authorizeGameOwner(gameId, codigo) {
  const { data: game } = await supabase.from('games').select('codigo, owner_id').eq('id', gameId).single();
  if (!game) return { ok: false, status: 404, error: 'Pelada não encontrada.' };

  if (game.owner_id) {
    const authClient = createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.id !== game.owner_id) {
      return { ok: false, status: 403, error: 'Só o capitão dessa pelada pode fazer isso.' };
    }
    return { ok: true };
  }

  if (game.codigo !== codigo) return { ok: false, status: 403, error: 'Código incorreto.' };
  return { ok: true };
}
