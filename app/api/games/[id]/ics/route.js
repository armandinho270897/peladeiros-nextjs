import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { buildIcsContent } from '@/lib/calendarEvent';

// Só gera o .ics pra quem tem confirmação 'aprovado' NESSA pelada — igual
// o botão já fica escondido pra quem tá na espera/aguardando confirmação,
// mas a checagem de verdade é aqui (o botão escondido é só UX, não
// segurança). Sem isso, dava pra baixar a agenda de qualquer pelada só
// sabendo o id, confirmado ou não.
export async function GET(request, { params }) {
  const { id } = params;

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const { data: confirmacao } = await supabase
    .from('confirmacoes')
    .select('status')
    .eq('game_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!confirmacao || confirmacao.status !== 'aprovado') {
    return NextResponse.json({ error: 'Só quem tem presença confirmada pode baixar a agenda dessa pelada.' }, { status: 403 });
  }

  const { data: game } = await supabase
    .from('games')
    .select('id, local, bairro, data, horario, tipo, nivel, valor, regras')
    .eq('id', id)
    .single();
  if (!game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  const ics = buildIcsContent(game);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="pelada-${id}.ics"`,
    },
  });
}
