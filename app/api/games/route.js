import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { attachNotaMedia } from '@/lib/ratings';

export async function GET() {
  const { data: games, error } = await supabase
    .from('games')
    .select('*, confirmacoes(*)')
    .order('data', { ascending: true })
    .order('horario', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const comNotas = await attachNotaMedia(games);
  // não devolve o código (PIN) pro front — só é usado server-side pra validar edição
  const safe = comNotas.map(({ codigo, ...g }) => g);
  return NextResponse.json(safe);
}

export async function POST(request) {
  if (!checkRateLimit(`games:create:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas peladas criadas em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra criar uma pelada.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Complete seu perfil antes de criar uma pelada.' }, { status: 400 });

  const body = await request.json();
  const { local, bairro, data, horario, vagasTotais, latitude, longitude, arenaId } = body;

  if (!local || !bairro || !data || !horario || !vagasTotais) {
    return NextResponse.json({ error: 'Dados inválidos. Confere se preencheu tudo.' }, { status: 400 });
  }

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      local, bairro, data, horario, vagas_totais: vagasTotais,
      capitao: profile.nome,
      owner_id: user.id,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      arena_id: arenaId ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { codigo: _omit, ...safe } = game;
  return NextResponse.json(safe, { status: 201 });
}
