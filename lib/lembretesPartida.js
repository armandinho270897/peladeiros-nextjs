import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createNotification } from '@/lib/notify';

// Notifica cada {user_id, game_id} de uma pelada prestes a começar que
// ainda não foi avisado NESSE tipo específico — miolo compartilhado entre
// a checagem reativa de ~3h (app/api/notificacoes/verificar-proximas,
// disparada quando o usuário abre o app) e o cron global de ~24h
// (app/api/cron/lembretes, roda 1x/dia mesmo sem ninguém abrir o app).
// `tipo` diferente pra cada janela (partida_proxima_24h / _3h, cada um com
// seu próprio índice único parcial — migration 036) é o que permite as
// duas avisarem a MESMA pessoa sobre a MESMA pelada sem uma "consumir" o
// aviso da outra — só evita repetir o mesmo tipo de aviso duas vezes.
export async function notificarPartidasProximas(candidatos, tipo, mensagemDe) {
  if (!candidatos || candidatos.length === 0) return 0;

  const gameIds = [...new Set(candidatos.map((c) => c.game_id))];
  const { data: jaNotificado } = await supabase
    .from('notificacoes')
    .select('user_id, game_id')
    .eq('tipo', tipo)
    .in('game_id', gameIds);
  const jaSet = new Set((jaNotificado || []).map((n) => `${n.user_id}:${n.game_id}`));

  let criadas = 0;
  for (const c of candidatos) {
    if (!c.user_id || jaSet.has(`${c.user_id}:${c.game_id}`)) continue;
    await createNotification({
      userId: c.user_id,
      tipo,
      gameId: c.game_id,
      mensagem: mensagemDe(c),
    });
    criadas++;
  }
  return criadas;
}
