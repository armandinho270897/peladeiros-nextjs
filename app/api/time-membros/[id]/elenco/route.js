import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';

// Posição/número/mensalista são específicos DESSE time (um jogador pode
// jogar de posições diferentes em times diferentes) — por isso vivem em
// time_membros, não em profiles, e só o capitão do time edita.
export async function PATCH(request, { params }) {
  if (!checkRateLimit(`time-membros:elenco:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { data: membro } = await supabase.from('time_membros').select('id, time_id').eq('id', id).maybeSingle();
  if (!membro) return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });

  const auth = await authorizeTimeCaptain(membro.time_id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { posicao, numeroCamisa, mensalista } = await request.json().catch(() => ({}));
  const numero = numeroCamisa === '' || numeroCamisa == null ? null : Number(numeroCamisa);
  if (numero != null && (!Number.isInteger(numero) || numero < 1 || numero > 99)) {
    return NextResponse.json({ error: 'Número da camisa precisa ser entre 1 e 99.' }, { status: 400 });
  }

  const { data: atualizado, error } = await supabase
    .from('time_membros')
    .update({ posicao: posicao || null, numero_camisa: numero, mensalista: !!mensalista })
    .eq('id', id)
    .select()
    .single();
  if (error) return errJson(error.message, 500);

  return NextResponse.json(atualizado);
}
