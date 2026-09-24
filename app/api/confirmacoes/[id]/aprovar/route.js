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

// A transição de estado (decidir se tem vaga, gravar o status) acontece
// toda dentro da função aprovar_confirmacao (supabase/migrations/054) —
// ela já resolve a corrida de duas aprovações simultâneas contando a
// mesma vaga livre. Erro esperado (não encontrada / já respondida / jogo
// sumiu) vem como exceção com essa mensagem exata; mapeia pro status certo.
const STATUS_POR_MENSAGEM = {
  'Solicitação não encontrada.': 404,
  'Essa solicitação já foi respondida.': 409,
  'Pelada não encontrada.': 404,
};

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

  // Só precisa do game_id pra autorizar — a função cuida do resto, e
  // valida de novo que a solicitação existe e ainda está pendente.
  const { data: confirmacaoPreview } = await supabase.from('confirmacoes').select('game_id').eq('id', id).maybeSingle();
  if (!confirmacaoPreview) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });

  const auth = await authorizeGameOwner(confirmacaoPreview.game_id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: resultado, error } = await supabase
    .rpc('aprovar_confirmacao', { p_confirmacao_id: id, p_prazo_confirmacao_ms: PRAZO_CONFIRMACAO_MS })
    .single();

  if (error) {
    const status = STATUS_POR_MENSAGEM[error.message];
    if (status) return NextResponse.json({ error: error.message }, { status });
    return errJson(error.message, 500);
  }

  if (resultado.user_id) {
    if (resultado.status === 'aguardando_confirmacao') {
      await createNotification({
        userId: resultado.user_id,
        tipo: 'aprovado_aguardando_confirmacao',
        gameId: resultado.game_id,
        mensagem: `Sua presença em ${resultado.game_local} foi aprovada! Confirma sua vaga em até 2h ou ela passa pro próximo do banco.${sufixoRecado}`,
        atorUserId: resultado.game_owner_id,
      });
      await cancelarConflitosDeHorario(resultado.user_id, { id: resultado.game_id, local: resultado.game_local, data: resultado.game_data, horario: resultado.game_horario });
    } else {
      await createNotification({
        userId: resultado.user_id,
        tipo: 'vaga_liberada_espera',
        gameId: resultado.game_id,
        mensagem: `Você foi aprovado em ${resultado.game_local}, mas sem vaga por enquanto — entrou no banco de reservas.${sufixoRecado}`,
        atorUserId: resultado.game_owner_id,
      });
    }
  }

  return NextResponse.json({ id: resultado.confirmacao_id, status: resultado.status, prazo_confirmacao: resultado.prazo_confirmacao });
}
