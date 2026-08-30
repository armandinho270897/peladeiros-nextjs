import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { jaAconteceu, souCapitaoDe } from '@/lib/gameUtils';

// Mesma regra da policy de select em pelada_mensagens (025/028_pelada_mensagens...sql)
// espelhada aqui pro lado da escrita — a escrita passa pelo service role
// (não por RLS), então essa checagem em código É a única barreira real pro
// insert. Capitão sempre pode, mesmo sem linha em confirmacoes — ver
// souCapitaoDe em lib/gameUtils.js.
export async function authorizeChatParticipante(gameId) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Faça login pra usar o chat.' };

  const { data: game } = await supabase.from('games').select('id, local, data, horario, owner_id').eq('id', gameId).maybeSingle();
  if (!game) return { ok: false, status: 404, error: 'Pelada não encontrada.' };

  if (jaAconteceu(game)) return { ok: false, status: 409, error: 'Esse chat já encerrou — a pelada já rolou.' };

  const souCapitao = souCapitaoDe(game, user.id);

  const { data: confirmacao } = await supabase
    .from('confirmacoes')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .eq('status', 'aprovado')
    .maybeSingle();

  if (!souCapitao && !confirmacao) return { ok: false, status: 403, error: 'Só quem confirmou presença nessa pelada pode usar o chat.' };

  return { ok: true, user, game };
}
