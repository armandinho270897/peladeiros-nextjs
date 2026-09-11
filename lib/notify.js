import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import * as Sentry from '@sentry/nextjs';
import { categoriaDe, NOTIF_TIPO_POR_ID } from '@/lib/notifCategorias';
import { sendEmail, emailTemplate } from '@/lib/sendEmail';

// Cria uma notificação in-app. Silenciosa em caso de erro — notificação é
// um "nice to have" que nunca deve derrubar a ação principal da rota.
// Respeita as preferências do destinatário (notif_prefs): chave ausente ou
// true = habilitado, só não cria se o usuário desligou esse tipo específico.
// Categoria "urgente" (lib/notifCategorias.js) também manda por e-mail —
// mesma preferência (notif_prefs) decide os dois canais juntos; ainda não
// existe um toggle separado por canal, só por tipo.
export async function createNotification({ userId, tipo, gameId, mensagem, atorUserId }) {
  if (!userId) return;

  const { data: perfil } = await supabase.from('profiles').select('notif_prefs').eq('id', userId).maybeSingle();
  if (perfil?.notif_prefs?.[tipo] === false) return;

  const { error } = await supabase.from('notificacoes').insert({ user_id: userId, tipo, game_id: gameId ?? null, mensagem, ator_user_id: atorUserId ?? null });
  if (error) {
    // 23505 = já existe (índice único parcial de tipos como partida_proxima,
    // ver migration 012) — corrida benigna entre duas checagens, não é falha
    // de verdade e não deve reenviar e-mail pra quem já foi avisado.
    if (error.code !== '23505') {
      console.error('createNotification falhou:', error.message);
      Sentry.captureException(new Error(`createNotification (${tipo}) falhou: ${error.message}`));
    }
    return;
  }

  if (categoriaDe(tipo) === 'urgente') {
    const { data } = await supabase.auth.admin.getUserById(userId);
    if (data?.user?.email) {
      const assunto = NOTIF_TIPO_POR_ID[tipo]?.label || 'Novo aviso';
      await sendEmail({ to: data.user.email, subject: `Peladeiros — ${assunto}`, html: emailTemplate(mensagem) });
    }
  }
}
