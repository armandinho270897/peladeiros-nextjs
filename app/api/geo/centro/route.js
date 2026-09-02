import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function mediana(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

// Centro geográfico (mediana de lat/lng) das arenas APROVADAS com
// coordenada — referência pra "essa coordenada tá muito longe de onde o
// app realmente é usado?" na hora de criar arena/pelada (validação de
// plausibilidade, ver LocationPickerMap.js). Dinâmico de propósito (não um
// ponto fixo tipo São Luís/MA) — continua fazendo sentido se o app crescer
// pra outras regiões.
//
// Duas correções depois de um falso-positivo real em produção: (1) só
// arena aprovada entra na conta — uma arena pendente com coordenada errada
// (ex: usuário nunca marcou o pino de verdade, ver fix em NewArenaModal.js)
// contaminava a referência antes de passar pela fila de aprovação; (2)
// MEDIANA em vez de média — a média é arrastada pra longe por um único
// ponto ruim (foi exatamente o que aconteceu: uma arena a ~1400km puxou o
// centro inteiro pra fora da cidade, fazendo bairros reais tipo Anjo da
// Guarda soarem "suspeitos"), a mediana ignora esse tipo de outlier.
export async function GET() {
  const { data: arenas, error } = await supabase
    .from('arenas')
    .select('latitude, longitude')
    .eq('status', 'aprovada')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) return errJson(error.message, 500);

  if (!arenas.length) return NextResponse.json(null);

  const lat = mediana(arenas.map((a) => Number(a.latitude)));
  const lng = mediana(arenas.map((a) => Number(a.longitude)));

  return NextResponse.json({ lat, lng, amostras: arenas.length });
}
