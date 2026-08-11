import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Cria uma notificação in-app. Silenciosa em caso de erro — notificação é
// um "nice to have" que nunca deve derrubar a ação principal da rota.
export async function createNotification({ userId, tipo, gameId, mensagem }) {
  if (!userId) return;
  const { error } = await supabase.from('notificacoes').insert({ user_id: userId, tipo, game_id: gameId ?? null, mensagem });
  if (error) console.error('createNotification falhou:', error.message);
}
