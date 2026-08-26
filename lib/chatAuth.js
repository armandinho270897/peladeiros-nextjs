import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { jaAconteceu } from '@/lib/gameUtils';

// Mesma regra da policy de select em pelada_mensagens (025_pelada_mensagens.sql)
// espelhada aqui pro lado da escrita — a escrita passa pelo service role
// (não por RLS), então essa checagem em código É a única barreira real pro
// insert. Sem exceção pro capitão: se ele não confirmou presença nele
// mesmo, também não pode postar.
export async function authorizeChatParticipante(gameId) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Faça login pra usar o chat.' };

  const { data: game } = await supabase.from('games').select('id, local, data, horario').eq('id', gameId).maybeSingle();
  if (!game) return { ok: false, status: 404, error: 'Pelada não encontrada.' };

  if (jaAconteceu(game)) return { ok: false, status: 409, error: 'Esse chat já encerrou — a pelada já rolou.' };

  const { data: confirmacao } = await supabase
    .from('confirmacoes')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .eq('status', 'aprovado')
    .maybeSingle();

  if (!confirmacao) return { ok: false, status: 403, error: 'Só quem confirmou presença nessa pelada pode usar o chat.' };

  return { ok: true, user, game };
}
