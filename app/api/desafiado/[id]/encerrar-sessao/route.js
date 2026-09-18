import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeDesafiadoCriador } from '@/lib/desafiadoAuth';

// Encerra a sessão inteira. Se tiver uma partida em andamento sem
// terminar, fecha ela também (sem vencedor — ninguém apostou nada, só para
// de contar) pra não sobrar nada solto.
export async function POST(request, { params }) {
  const { id } = params;
  const auth = await authorizeDesafiadoCriador(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await supabase
    .from('desafiado_partidas')
    .update({ status: 'encerrada', encerrada_em: new Date().toISOString() })
    .eq('sessao_id', id)
    .eq('status', 'em_andamento');

  const { data: sessao, error } = await supabase
    .from('desafiado_sessoes')
    .update({ status: 'encerrada', encerrada_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return errJson(error.message, 500);

  return NextResponse.json(sessao);
}
