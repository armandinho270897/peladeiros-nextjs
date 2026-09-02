import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';
import { ADMIN_USER_ID } from '@/lib/adminConfig';

const TIPOS_VALIDOS = ['quadra escolar', 'arena', 'quadra pública', 'rua', 'campo', 'estádio'];

// Bug real encontrado em produção num endpoint irmão (/api/games/mapa): o
// Data Cache do Next pra chamadas fetch (usadas pelo supabase-js por
// baixo) pode servir uma resposta cacheada antiga entre deploys, mesmo o
// GET sendo classificado como dinâmico. Esse GET tem o mesmo formato de
// risco (supabaseAdmin, sem leitura de cookie) — sem isso, uma arena nova
// (ou recém auto-aprovada) podia não aparecer no mapa nem no seletor de
// "vincular arena existente" até o próximo deploy.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Só arenas aprovadas aparecem no mapa público e no seletor de "vincular
// arena existente" ao criar pelada — pendentes ficam de fora até passar
// pela fila de aprovação (rota separada, admin-only).
//
// Exceção: ?todas=1 com sessão autenticada também traz as pendentes — usado
// só pelo seletor de local de nova pelada, pra quem já vai criar uma pelada
// ver que aquele lugar já foi proposto e evitar duplicar o cadastro. Sem
// sessão o parâmetro é ignorado (mesmo comportamento de sempre), pra não
// expor propostas pendentes (nome/foto/coordenada) a visitante anônimo.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let incluirPendentes = false;
  if (searchParams.get('todas') === '1') {
    const authClient = createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    incluirPendentes = !!user;
  }

  let query = supabase.from('arenas').select('*').order('nome', { ascending: true });
  if (!incluirPendentes) query = query.eq('status', 'aprovada');

  const { data: arenas, error } = await query;

  if (error) return errJson(error.message, 500);

  return NextResponse.json(arenas);
}

export async function POST(request) {
  if (!checkRateLimit(`arenas:create:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas arenas cadastradas em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Precisa estar logado pra cadastrar uma arena.' }, { status: 401 });
  }

  const body = await request.json();
  const { nome, endereco, bairro, tipo, latitude, longitude, fotoUrl } = body;

  if (!nome || !endereco || !bairro || !TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: 'Dados inválidos. Confere se preencheu tudo e escolheu um tipo válido.' }, { status: 400 });
  }

  // O dono do app cadastra direto, já aprovada — não faz sentido ele
  // aprovar a própria sugestão. Qualquer outro usuário segue o fluxo normal
  // (pendente até passar pela fila em /admin/arenas).
  const status = user.id === ADMIN_USER_ID ? 'aprovada' : 'pendente';

  const { data: arena, error } = await supabase
    .from('arenas')
    .insert({
      nome, endereco, bairro, tipo,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      foto_url: fotoUrl || null,
      status,
      proposto_por_user_id: user.id,
    })
    .select()
    .single();

  if (error) return errJson(error.message, 500);

  return NextResponse.json(arena, { status: 201 });
}
