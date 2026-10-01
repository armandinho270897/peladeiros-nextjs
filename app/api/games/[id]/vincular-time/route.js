import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

const STATUS_POR_MENSAGEM = {
  'Pelada não encontrada.': 404,
  'Time não encontrado.': 404,
};

// Vincula um time a uma pelada: os membros aprovados do time entram DIRETO
// (aprovado, dentro da capacidade restante — mesmo critério que
// jogadoresIniciais já usa em POST /api/games; espera se estourar), sem
// passar pela fila de aprovação do capitão — é essa a vantagem real de
// fazer parte do time, que antes não existia (todo mundo virava só mais
// uma solicitação pendente igual um estranho).
//
// Contar vagas ocupadas e decidir aprovado/espera pra cada membro acontece
// todo dentro de vincular_time_pelada (migration 063) — ela trava a linha
// do jogo, mesmo mecanismo de aprovar_confirmacao/adicionar_jogador_direto,
// pra duas chamadas concorrentes (ou uma concorrente com outra ação no
// mesmo jogo) não contarem a mesma vaga livre duas vezes.
export async function POST(request, { params }) {
  if (!(await checkRateLimit(`games:vincular-time:${getClientIp(request)}`))) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { timeId, codigo } = await request.json().catch(() => ({}));
  if (!timeId) return NextResponse.json({ error: 'Selecione um time.' }, { status: 400 });

  const auth = await authorizeGameOwner(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { count: totalMembros } = await supabase
    .from('time_membros')
    .select('user_id', { count: 'exact', head: true })
    .eq('time_id', timeId)
    .eq('status', 'aprovado');

  const { data: vinculados, error } = await supabase.rpc('vincular_time_pelada', { p_game_id: id, p_time_id: timeId });

  if (error) {
    const status = STATUS_POR_MENSAGEM[error.message];
    if (status) return NextResponse.json({ error: error.message }, { status });
    return errJson(error, 500);
  }

  for (const v of vinculados || []) {
    await createNotification({
      userId: v.user_id,
      tipo: 'convite_time_pelada',
      gameId: id,
      mensagem: v.novo_status === 'aprovado'
        ? `Seu time ${v.time_nome} foi vinculado à pelada em ${v.game_local}. Você já está confirmado!`
        : `Seu time ${v.time_nome} foi vinculado à pelada em ${v.game_local}, mas sem vaga agora — você entrou no banco de reservas.`,
    });
  }

  const convidados = (vinculados || []).length;
  return NextResponse.json({ convidados, jaExistentes: Math.max(0, (totalMembros || 0) - convidados) });
}
