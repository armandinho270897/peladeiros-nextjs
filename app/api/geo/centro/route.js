import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Centro geográfico (média simples de lat/lng) de todas as arenas com
// coordenada — referência pra "essa coordenada tá muito longe de onde o
// app realmente é usado?" na hora de criar arena/pelada (validação de
// plausibilidade, ver LocationPickerMap.js). Usa arenas (qualquer status,
// não só aprovada) em vez de peladas futuras: é o conjunto mais estável —
// peladas futuras podem estar vazias em qualquer momento (app fora do
// pico), enquanto arenas cadastradas só crescem. Dinâmico de propósito
// (não um ponto fixo tipo São Luís/MA) — continua fazendo sentido se o
// app crescer pra outras regiões.
export async function GET() {
  const { data: arenas, error } = await supabase
    .from('arenas')
    .select('latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) return errJson(error.message, 500);

  if (!arenas.length) return NextResponse.json(null);

  const lat = arenas.reduce((soma, a) => soma + Number(a.latitude), 0) / arenas.length;
  const lng = arenas.reduce((soma, a) => soma + Number(a.longitude), 0) / arenas.length;

  return NextResponse.json({ lat, lng, amostras: arenas.length });
}
