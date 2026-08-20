import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import * as Sentry from '@sentry/nextjs';
import { createNotification } from '@/lib/notify';

const PRAZO_CONFIRMACAO_MS = 2 * 60 * 60 * 1000;

// Promove os próximos do banco de reservas pra 'aguardando_confirmacao'
// (não direto pra 'aprovado') — reservam a vaga, mas também têm que
// confirmar dentro do prazo, senão o problema de "vaga trava" reaparece
// exatamente nesse ponto.
export async function promoverEsperaComConfirmacao(gameId, quantidade) {
  if (quantidade <= 0) return;

  const { data: game } = await supabase.from('games').select('local').eq('id', gameId).single();

  const { data: candidatos } = await supabase
    .from('confirmacoes')
    .select('id, user_id')
    .eq('game_id', gameId)
    .eq('status', 'espera')
    .order('created_at', { ascending: true })
    .limit(quantidade);

  for (const c of candidatos || []) {
    const { error: promoverError } = await supabase
      .from('confirmacoes')
      .update({ status: 'aguardando_confirmacao', prazo_confirmacao: new Date(Date.now() + PRAZO_CONFIRMACAO_MS).toISOString() })
      .eq('id', c.id);
    if (promoverError) Sentry.captureException(new Error(promoverError.message));
    if (c.user_id) {
      await createNotification({
        userId: c.user_id,
        tipo: 'aprovado_aguardando_confirmacao',
        gameId,
        mensagem: `Uma vaga abriu em ${game?.local || 'sua pelada'}! Confirma sua presença em até 2h ou ela passa pro próximo do banco.`,
      });
    }
  }
}

// Sem cron: essa checagem roda no início dos GETs de games (mesmo padrão
// de "calcula no request" já usado por attachNotaMedia) — acha quem deixou
// o prazo vencer, libera a vaga e promove o próximo do banco no lugar.
export async function sweepExpiredConfirmacoes() {
  const { data: vencidas } = await supabase
    .from('confirmacoes')
    .select('id, game_id, user_id')
    .eq('status', 'aguardando_confirmacao')
    .lt('prazo_confirmacao', new Date().toISOString());

  if (!vencidas || vencidas.length === 0) return;

  const porJogo = {};
  for (const c of vencidas) {
    porJogo[c.game_id] = (porJogo[c.game_id] || 0) + 1;
    const { error: expirarError } = await supabase.from('confirmacoes').update({ status: 'rejeitado', prazo_confirmacao: null }).eq('id', c.id);
    if (expirarError) Sentry.captureException(new Error(expirarError.message));
    if (c.user_id) {
      await createNotification({
        userId: c.user_id,
        tipo: 'vaga_expirada',
        gameId: c.game_id,
        mensagem: 'Sua vaga expirou porque você não confirmou a tempo — ela foi pro próximo do banco de reservas.',
      });
    }
  }

  for (const [gameId, quantidade] of Object.entries(porJogo)) {
    await promoverEsperaComConfirmacao(gameId, quantidade);
  }
}
