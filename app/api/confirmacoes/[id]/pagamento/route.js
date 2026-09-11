import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { authorizeGameOwner } from '@/lib/gameAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';

// Marca/desmarca o pagamento do valor da PELADA (games.valor) por quem
// confirmou presença — mesmo padrão simples de `presente` em vez de um
// histórico de mensalidades como o do time (aqui não tem "mês", é só essa
// pelada, uma vez só).
export async function PATCH(request, { params }) {
  if (!checkRateLimit(`pagamento:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { codigo, pago } = await request.json().catch(() => ({}));
  if (typeof pago !== 'boolean') return NextResponse.json({ error: 'Faltou dizer se pagou ou não.' }, { status: 400 });

  const { data: confirmacao } = await supabase.from('confirmacoes').select('id, game_id').eq('id', id).single();
  if (!confirmacao) return NextResponse.json({ error: 'Confirmação não encontrada.' }, { status: 404 });

  const auth = await authorizeGameOwner(confirmacao.game_id, codigo);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabase.from('confirmacoes').update({ pago }).eq('id', id);
  if (error) return errJson(error.message, 500);

  return NextResponse.json({ ok: true });
}
