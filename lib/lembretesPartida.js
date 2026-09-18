import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createNotification } from '@/lib/notify';

// Notifica cada {user_id, game_id} que ainda não foi avisado NESSE tipo
// específico — miolo compartilhado por todo lembrete relacionado a pelada
// (partida próxima em 24h/3h, check-in, encerrar partida pendente), tanto
// checagem reativa (usuário abre o app) quanto cron global (roda mesmo sem
// ninguém abrir o app). `tipo` diferente pra cada lembrete (cada um com
// seu próprio índice único parcial em notificacoes) é o que permite vários
// lembretes avisarem a MESMA pessoa sobre a MESMA pelada sem um "consumir"
// o aviso do outro — só evita repetir o mesmo tipo de aviso duas vezes.
export async function notificarUmaVezPorTipo(candidatos, tipo, mensagemDe) {
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
