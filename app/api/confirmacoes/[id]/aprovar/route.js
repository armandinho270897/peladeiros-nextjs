import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

const PRAZO_CONFIRMACAO_MS = 2 * 60 * 60 * 1000;

// O app não guarda duração/horário de término da pelada — assume ~2h de
// jogo pra decidir se duas peladas no mesmo dia "brigam" de horário.
const JANELA_CONFLITO_MS = 2 * 60 * 60 * 1000;

// Ao aprovar alguém, cancela sozinho as OUTRAS solicitações pendentes dela
// em peladas que se sobrepõem no mesmo dia — não mexe em aprovações já
// dadas em outro lugar, só evita empilhar pendências que não dá pra cumprir.
async function cancelarConflitosDeHorario(userId, gameAprovado) {
  if (!userId) return;

  const { data: outrasPendentes } = await supabase
    .from('confirmacoes')
    .select('id, game_id, games(local, data, horario)')
    .eq('user_id', userId)
    .eq('status', 'pendente')
    .neq('game_id', gameAprovado.id);

  const inicioAprovado = new Date(`${gameAprovado.data}T${gameAprovado.horario}`).getTime();

  for (const c of outrasPendentes || []) {
    const outroGame = c.games;
    if (!outroGame || outroGame.data !== gameAprovado.data) continue;
    const inicioOutro = new Date(`${outroGame.data}T${outroGame.horario}`).getTime();
    if (Math.abs(inicioOutro - inicioAprovado) >= JANELA_CONFLITO_MS) continue;

    const { error: cancelError } = await supabase.from('confirmacoes').update({ status: 'rejeitado' }).eq('id', c.id);
    if (cancelError) Sentry.captureException(new Error(cancelError.message));
    await createNotification({
      userId,
      tipo: 'conflito_horario',
      gameId: c.game_id,
      mensagem: `Sua solicitação em ${outroGame.local} foi cancelada automaticamente — conflita de horário com ${gameAprovado.local}, que você teve aprovado.`,
    });
  }
}

export async function POST(request, { params }) {
  if (!checkRateLimit(`aprovar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { codigo, mensagemCapitao } = await request.json().catch(() => ({}));
  const recadoCapitao = mensagemCapitao?.trim().slice(0, 200) || '';
  const sufixoRecado = recadoCapitao ? ` Recado do capitão: "${recadoCapitao}"` : '';

  const { data: confirmacao } = await supabase.from('confirmacoes').select('id, game_id, status, user_id').eq('id', id).single();
  if (!confirmacao) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
  if (confirmacao.status !== 'pendente') return NextResponse.json({ error: 'Essa solicitação já foi respondida.' }, { status: 409 });

  const { data: game } = await supabase.from('games').select('vagas_totais, local, data, horario, owner_id').eq('id', confirmacao.game_id).single();
  if (!game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  const auth = await authorizeGameOwner(confirmacao.game_id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { count } = await supabase
    .from('confirmacoes')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', confirmacao.game_id)
    .in('status', ['aprovado', 'aguardando_confirmacao']);

  const temVaga = count < game.vagas_totais;
  const novoStatus = temVaga ? 'aguardando_confirmacao' : 'espera';
  const prazoConfirmacao = temVaga ? new Date(Date.now() + PRAZO_CONFIRMACAO_MS).toISOString() : null;

  const { data: atualizada, error } = await supabase
    .from('confirmacoes')
    .update({ status: novoStatus, prazo_confirmacao: prazoConfirmacao })
    .eq('id', id)
    .select()
    .single();

  if (error) return errJson(error.message, 500);

  if (confirmacao.user_id) {
    if (novoStatus === 'aguardando_confirmacao') {
      await createNotification({
        userId: confirmacao.user_id,
        tipo: 'aprovado_aguardando_confirmacao',
        gameId: confirmacao.game_id,
        mensagem: `Sua presença em ${game.local} foi aprovada! Confirma sua vaga em até 2h ou ela passa pro próximo do banco.${sufixoRecado}`,
        atorUserId: game.owner_id,
      });
      await cancelarConflitosDeHorario(confirmacao.user_id, { id: confirmacao.game_id, ...game });
    } else {
      await createNotification({
        userId: confirmacao.user_id,
        tipo: 'vaga_liberada_espera',
        gameId: confirmacao.game_id,
        mensagem: `Você foi aprovado em ${game.local}, mas sem vaga por enquanto — entrou no banco de reservas.${sufixoRecado}`,
        atorUserId: game.owner_id,
      });
    }
  }

  return NextResponse.json(atualizada);
}
