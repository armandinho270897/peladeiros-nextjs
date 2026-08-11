import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request, { params }) {
  if (!checkRateLimit(`confirmar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas confirmações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra confirmar presença.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('nome, whatsapp').eq('id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Complete seu perfil antes de confirmar presença.' }, { status: 400 });

  const { id } = params;

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('vagas_totais')
    .eq('id', id)
    .single();

  if (gameError || !game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  const { data: existente } = await supabase
    .from('confirmacoes')
    .select('id')
    .eq('game_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existente) {
    return NextResponse.json({ error: 'Você já confirmou presença nessa pelada.' }, { status: 409 });
  }

  const { count } = await supabase
    .from('confirmacoes')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', id)
    .eq('status', 'confirmado');

  const status = count >= game.vagas_totais ? 'espera' : 'confirmado';

  const { data: confirmacao, error } = await supabase
    .from('confirmacoes')
    .insert({ game_id: id, user_id: user.id, nome: profile.nome, whatsapp: profile.whatsapp, status })
    .select()
    .single();

  if (error) {
    // guarda-costas final contra corrida (constraint unique game_id+user_id)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Você já confirmou presença nessa pelada.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(confirmacao, { status: 201 });
}
