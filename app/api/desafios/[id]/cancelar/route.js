import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';

// Só quem propôs (capitão do time desafiante) pode cancelar, e só enquanto
// ainda estiver pendente — depois de aceito/recusado não faz mais sentido.
export async function POST(request, { params }) {
  if (!checkRateLimit(`desafios:cancelar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;

  const { data: desafio } = await supabase.from('desafios').select('*').eq('id', id).maybeSingle();
  if (!desafio) return NextResponse.json({ error: 'Desafio não encontrado.' }, { status: 404 });
  if (desafio.status !== 'pendente') return NextResponse.json({ error: 'Esse desafio já foi respondido.' }, { status: 409 });

  const auth = await authorizeTimeCaptain(desafio.time_desafiante_id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabase
    .from('desafios')
    .update({ status: 'cancelado', respondido_em: new Date().toISOString() })
    .eq('id', id);
  if (error) return errJson(error.message, 500);

  return NextResponse.json({ ok: true });
}
