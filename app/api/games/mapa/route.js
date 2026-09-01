import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { todayISO } from '@/lib/gameUtils';
import { errJson } from '@/lib/apiError';

// Sem isso o Next pode otimizar essa rota como estática (não lê cookies nem
// params) e congelar a resposta no momento do build — o filtro "gte data
// hoje" e a lista de peladas precisam ser recalculados a cada request.
export const dynamic = 'force-dynamic';
// dynamic sozinho não bastou: o Next tem um Data Cache separado (persiste
// entre deploys) pra chamadas fetch — como o supabase-js usa fetch por
// baixo, a MESMA URL de query (mesmo filtro de data) podia estar servindo
// uma resposta cacheada de antes, mesmo com force-dynamic. force-no-store
// garante que cada request bate no banco de verdade. Bug real encontrado
// em produção: /api/games/mapa devolvia lista vazia mesmo com jogo futuro
// cadastrado e com coordenada válida — confirmado via debug que a query
// SEM esse fetchCache batia direto num resultado desatualizado.
export const fetchCache = 'force-no-store';

// Versão enxuta de /api/games só com o que os mapas de contexto precisam
// (escolher local de pelada/arena nova) — peladas futuras com coordenada,
// sem o join de avaliações (attachNotaMedia) nem o histórico de
// confirmações inteiro que /api/games carrega pra lista completa.
export async function GET() {
  const { data: games, error } = await supabase
    .from('games')
    .select('id, local, data, horario, vagas_totais, latitude, longitude, arena_id, tipo, confirmacoes(status)')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gte('data', todayISO())
    .order('data', { ascending: true });

  if (error) return errJson(error.message, 500);
  return NextResponse.json(games);
}
