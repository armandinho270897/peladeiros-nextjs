import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';

// Encerramento formal: o capitão marca quem não compareceu entre os
// aprovados (todo mundo começa presente por padrão — só desmarca a
// exceção). Libera avaliação da pelada e registra falta pra quem foi
// marcado ausente, sem punição automática (sem banimento, sem bloqueio).
export async function POST(request, { params }) {
  if (!checkRateLimit(`encerrar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { codigo, ausentesIds } = await request.json().catch(() => ({}));

  const auth = await authorizeGameOwner(id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: game } = await supabase.from('games').select('data, horario, encerrada_em').eq('id', id).single();
  if (!game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });
  if (game.encerrada_em) return NextResponse.json({ error: 'Essa pelada já foi encerrada.' }, { status: 409 });

  const inicio = new Date(`${game.data}T${game.horario}`);
  if (inicio.getTime() > Date.now()) {
    return NextResponse.json({ error: 'Só dá pra encerrar depois que o horário da pelada já passou.' }, { status: 400 });
  }

  const { data: aprovados } = await supabase.from('confirmacoes').select('id').eq('game_id', id).eq('status', 'aprovado');

  const ausentesSet = new Set(Array.isArray(ausentesIds) ? ausentesIds : []);
  const presentesIds = (aprovados || []).filter((c) => !ausentesSet.has(c.id)).map((c) => c.id);
  const idsAusentesReais = (aprovados || []).filter((c) => ausentesSet.has(c.id)).map((c) => c.id);

  if (presentesIds.length > 0) {
    const { error: presenteError } = await supabase.from('confirmacoes').update({ presente: true }).in('id', presentesIds);
    if (presenteError) return errJson(presenteError.message, 500);
  }
  if (idsAusentesReais.length > 0) {
    const { error: ausenteError } = await supabase.from('confirmacoes').update({ presente: false }).in('id', idsAusentesReais);
    if (ausenteError) return errJson(ausenteError.message, 500);
  }

  const { error } = await supabase.from('games').update({ encerrada_em: new Date().toISOString() }).eq('id', id);
  if (error) return errJson(error.message, 500);

  return NextResponse.json({ ok: true, presentes: presentesIds.length, ausentes: idsAusentesReais.length });
}
