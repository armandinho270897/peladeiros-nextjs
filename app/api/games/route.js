import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function GET() {
  const { data: games, error } = await supabase
    .from('games')
    .select('*, confirmacoes(*)')
    .order('data', { ascending: true })
    .order('horario', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // não devolve o código (PIN) pro front — só é usado server-side pra validar edição
  const safe = games.map(({ codigo, ...g }) => g);
  return NextResponse.json(safe);
}

export async function POST(request) {
  if (!checkRateLimit(`games:create:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas peladas criadas em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const body = await request.json();
  const { local, bairro, data, horario, vagasTotais, capitao, codigo, latitude, longitude } = body;

  if (!local || !bairro || !data || !horario || !vagasTotais || !capitao || !/^\d{4}$/.test(codigo || '')) {
    return NextResponse.json({ error: 'Dados inválidos. Confere se preencheu tudo e o código tem 4 números.' }, { status: 400 });
  }

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      local, bairro, data, horario, vagas_totais: vagasTotais, capitao, codigo,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { codigo: _omit, ...safe } = game;
  return NextResponse.json(safe, { status: 201 });
}
