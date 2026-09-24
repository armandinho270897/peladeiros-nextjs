import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

// Aceitar um desafio cria a pelada na hora, com os membros aprovados dos
// dois times já confirmados (não pendentes) — reaproveita 100% da
// infraestrutura de pelada que já existe (chat, encerrar, avaliar). Toda
// essa criação roda dentro da função desafios_aceitar (supabase/migrations/
// 056), numa transação só — se qualquer passo falhar (inserir a pelada,
// confirmar os membros, marcar o desafio), tudo volta, sem precisar de
// código de "desfazer" manual em cada ponto.
const STATUS_POR_MENSAGEM = {
  'Desafio não encontrado.': 404,
  'Esse desafio já foi respondido.': 409,
  'A data desse desafio já passou. Peça pro outro time propor uma nova.': 409,
};

export async function POST(request, { params }) {
  if (!checkRateLimit(`desafios:aceitar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;

  // Só precisa saber qual time foi desafiado pra autorizar — a função
  // confere de novo que o desafio existe, está pendente e a data não passou.
  const { data: desafioPreview } = await supabase.from('desafios').select('time_desafiado_id, status').eq('id', id).maybeSingle();
  if (!desafioPreview) return NextResponse.json({ error: 'Desafio não encontrado.' }, { status: 404 });
  if (desafioPreview.status !== 'pendente') return NextResponse.json({ error: 'Esse desafio já foi respondido.' }, { status: 409 });

  const auth = await authorizeTimeCaptain(desafioPreview.time_desafiado_id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: resultado, error } = await supabase
    .rpc('desafios_aceitar', { p_desafio_id: id, p_aceitador_user_id: auth.user.id })
    .single();

  if (error) {
    const status = STATUS_POR_MENSAGEM[error.message];
    if (status) return NextResponse.json({ error: error.message }, { status });
    return errJson(error.message, 500);
  }

  const { data: capitaesDesafiante } = await supabase
    .from('time_membros')
    .select('user_id')
    .eq('time_id', resultado.time_desafiante_id)
    .eq('papel', 'capitao')
    .eq('status', 'aprovado');

  for (const c of capitaesDesafiante || []) {
    await createNotification({
      userId: c.user_id,
      tipo: 'desafio_aceito',
      gameId: resultado.game_id,
      mensagem: `${resultado.time_desafiado_nome || 'O time'} aceitou o desafio! Partida marcada em ${resultado.local}, ${resultado.data} às ${resultado.horario}.`,
      atorUserId: auth.user.id,
    });
  }

  return NextResponse.json({ gameId: resultado.game_id });
}
