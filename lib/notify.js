import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Cria uma notificação in-app. Silenciosa em caso de erro — notificação é
// um "nice to have" que nunca deve derrubar a ação principal da rota.
// Respeita as preferências do destinatário (notif_prefs): chave ausente ou
// true = habilitado, só não cria se o usuário desligou esse tipo específico.
export async function createNotification({ userId, tipo, gameId, mensagem, atorUserId }) {
  if (!userId) return;

  const { data: perfil } = await supabase.from('profiles').select('notif_prefs').eq('id', userId).maybeSingle();
  if (perfil?.notif_prefs?.[tipo] === false) return;

  const { error } = await supabase.from('notificacoes').insert({ user_id: userId, tipo, game_id: gameId ?? null, mensagem, ator_user_id: atorUserId ?? null });
  if (error) console.error('createNotification falhou:', error.message);
}
