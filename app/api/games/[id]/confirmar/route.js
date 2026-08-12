import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';

export async function POST(request, { params }) {
  if (!checkRateLimit(`confirmar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas confirmações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra confirmar presença.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('nome, whatsapp, bairro').eq('id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Complete seu perfil antes de confirmar presença.' }, { status: 400 });

  const { id } = params;

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, local, owner_id')
    .eq('id', id)
    .single();

  if (gameError || !game) return NextResponse.json({ error: 'Pelada não encontrada.' }, { status: 404 });

  const { data: existente } = await supabase
    .from('confirmacoes')
    .select('id, status')
    .eq('game_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existente) {
    if (existente.status === 'rejeitado' || existente.status === 'cancelado') {
      // rejeitado/cancelado não é banimento — deixa a pessoa pedir de novo
      const { data: revivida, error: reviveError } = await supabase
        .from('confirmacoes')
        .update({ status: 'pendente', cancelado_em: null })
        .eq('id', existente.id)
        .select()
        .single();
      if (reviveError) return NextResponse.json({ error: reviveError.message }, { status: 500 });
      if (game.owner_id) {
        await createNotification({
          userId: game.owner_id,
          tipo: 'solicitacao_pendente',
          gameId: id,
          mensagem: `${profile.nome} pediu pra entrar na sua pelada em ${game.local}.`,
        });
      }
      return NextResponse.json(revivida, { status: 201 });
    }
    return NextResponse.json({ error: 'Você já solicitou presença nessa pelada.' }, { status: 409 });
  }

  const { data: confirmacao, error } = await supabase
    .from('confirmacoes')
    .insert({ game_id: id, user_id: user.id, nome: profile.nome, whatsapp: profile.whatsapp, bairro: profile.bairro ?? null, status: 'pendente' })
    .select()
    .single();

  if (error) {
    // guarda-costas final contra corrida (constraint unique game_id+user_id)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Você já solicitou presença nessa pelada.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (game.owner_id) {
    await createNotification({
      userId: game.owner_id,
      tipo: 'solicitacao_pendente',
      gameId: id,
      mensagem: `${profile.nome} pediu pra entrar na sua pelada em ${game.local}.`,
    });
  }

  return NextResponse.json(confirmacao, { status: 201 });
}
