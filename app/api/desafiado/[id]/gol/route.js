import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeDesafiadoCriador } from '@/lib/desafiadoAuth';

export async function POST(request, { params }) {
  const { id } = params;
  const auth = await authorizeDesafiadoCriador(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { timeId } = await request.json().catch(() => ({}));
  if (!timeId) return NextResponse.json({ error: 'Informe o time.' }, { status: 400 });

  const { data: partida } = await supabase.from('desafiado_partidas').select('*').eq('sessao_id', id).eq('status', 'em_andamento').maybeSingle();
  if (!partida) return NextResponse.json({ error: 'Nenhuma partida em andamento agora.' }, { status: 400 });

  let campo;
  if (timeId === partida.time_a_id) campo = 'gols_time_a';
  else if (timeId === partida.time_b_id) campo = 'gols_time_b';
  else return NextResponse.json({ error: 'Esse time não está jogando essa partida.' }, { status: 400 });

  const { data: atualizada, error } = await supabase
    .from('desafiado_partidas')
    .update({ [campo]: partida[campo] + 1 })
    .eq('id', partida.id)
    .select()
    .single();
  if (error) return errJson(error.message, 500);

  return NextResponse.json(atualizada);
}
