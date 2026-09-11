import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createNotification } from '@/lib/notify';

// Notifica cada {user_id, game_id} de uma pelada prestes a começar que
// ainda não foi avisado — miolo compartilhado entre a checagem reativa
// (app/api/notificacoes/verificar-proximas, disparada quando o usuário
// abre o app) e o cron global (app/api/cron/lembretes), que varre TODO
// mundo mesmo que não tenha aberto o app. As duas convergem pro mesmo
// dedup (por user_id+game_id) — não importa qual delas chega primeiro,
// a segunda não duplica.
export async function notificarPartidasProximas(candidatos) {
  if (!candidatos || candidatos.length === 0) return 0;

  const gameIds = [...new Set(candidatos.map((c) => c.game_id))];
  const { data: jaNotificado } = await supabase
    .from('notificacoes')
    .select('user_id, game_id')
    .eq('tipo', 'partida_proxima')
    .in('game_id', gameIds);
  const jaSet = new Set((jaNotificado || []).map((n) => `${n.user_id}:${n.game_id}`));

  let criadas = 0;
  for (const c of candidatos) {
    if (!c.user_id || jaSet.has(`${c.user_id}:${c.game_id}`)) continue;
    await createNotification({
      userId: c.user_id,
      tipo: 'partida_proxima',
      gameId: c.game_id,
      mensagem: `Sua pelada em ${c.games.local} começa em breve!`,
    });
    criadas++;
  }
  return criadas;
}
