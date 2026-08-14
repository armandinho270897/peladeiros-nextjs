import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const TIPOS_VALIDOS = ['quadra escolar', 'arena', 'quadra pública', 'rua', 'campo', 'estádio'];

export async function GET() {
  const { data: arenas, error } = await supabase
    .from('arenas')
    .select('*')
    .order('nome', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(arenas);
}

export async function POST(request) {
  if (!checkRateLimit(`arenas:create:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas arenas cadastradas em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const body = await request.json();
  const { nome, endereco, bairro, tipo, latitude, longitude } = body;

  if (!nome || !endereco || !bairro || !TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: 'Dados inválidos. Confere se preencheu tudo e escolheu um tipo válido.' }, { status: 400 });
  }

  const { data: arena, error } = await supabase
    .from('arenas')
    .insert({
      nome, endereco, bairro, tipo,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(arena, { status: 201 });
}
