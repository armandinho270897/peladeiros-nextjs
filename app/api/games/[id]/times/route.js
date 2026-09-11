import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';

// Salva a divisão de times (A/B) dessa pelada — mesma autorização de quem
// pode editar a pelada (authorizeGameOwner). `atribuicoes` é um mapa
// confirmacaoId -> 'A'|'B'|null (null tira do time, volta pra "sem time").
// Só mexe nos ids passados, não apaga o resto — permite ajustar um jogador
// por vez sem reenviar a escalação inteira.
export async function PATCH(request, { params }) {
  if (!checkRateLimit(`times-pelada:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { codigo, atribuicoes } = await request.json();

  const auth = await authorizeGameOwner(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!atribuicoes || typeof atribuicoes !== 'object') {
    return NextResponse.json({ error: 'Faltou a escalação.' }, { status: 400 });
  }

  const entradas = Object.entries(atribuicoes);
  if (entradas.some(([, time]) => time !== 'A' && time !== 'B' && time !== null)) {
    return NextResponse.json({ error: 'Time inválido — só A, B ou nenhum.' }, { status: 400 });
  }

  for (const [confirmacaoId, time] of entradas) {
    const { error } = await supabase.from('confirmacoes').update({ time }).eq('id', confirmacaoId).eq('game_id', id);
    if (error) return errJson(error.message, 500);
  }

  return NextResponse.json({ ok: true });
}
