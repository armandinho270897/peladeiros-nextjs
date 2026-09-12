import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';

// Marcação manual de presença/falta pelo organizador, ANTES do encerramento
// formal (EncerrarPartidaModal / POST /encerrar continua sendo o veredito
// definitivo — essa rota só ajuda a corrigir/acompanhar em tempo real,
// reaproveitando o mesmo campo confirmacoes.presente, sem criar uma segunda
// fonte de verdade). Trava depois de encerrada: nesse ponto, presente já é
// definitivo e só se corrige via um novo encerramento não existe — mesma
// regra que o resto do app.
export async function PATCH(request, { params }) {
  if (!checkRateLimit(`presenca:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { presente } = await request.json().catch(() => ({}));
  if (presente !== true && presente !== false && presente !== null) {
    return NextResponse.json({ error: 'Valor de presença inválido.' }, { status: 400 });
  }

  const { data: confirmacao } = await supabase
    .from('confirmacoes')
    .select('id, game_id, status, games(encerrada_em)')
    .eq('id', id)
    .single();
  if (!confirmacao) return NextResponse.json({ error: 'Confirmação não encontrada.' }, { status: 404 });
  if (confirmacao.status !== 'aprovado') {
    return NextResponse.json({ error: 'Só dá pra marcar presença de quem está confirmado.' }, { status: 409 });
  }
  if (confirmacao.games?.encerrada_em) {
    return NextResponse.json({ error: 'Essa partida já foi encerrada — presença não é mais editável por aqui.' }, { status: 409 });
  }

  const auth = await authorizeGameOwner(confirmacao.game_id, undefined);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabase.from('confirmacoes').update({ presente }).eq('id', id);
  if (error) return errJson(error.message, 500);

  return NextResponse.json({ ok: true });
}
