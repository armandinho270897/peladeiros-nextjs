import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';
import { ADMIN_USER_ID } from '@/lib/adminConfig';

const TIPOS_VALIDOS = ['quadra escolar', 'arena', 'quadra pública', 'rua', 'campo', 'estádio'];

// Só arenas aprovadas aparecem no mapa público e no seletor de "vincular
// arena existente" ao criar pelada — pendentes ficam de fora até passar
// pela fila de aprovação (rota separada, admin-only).
export async function GET() {
  const { data: arenas, error } = await supabase
    .from('arenas')
    .select('*')
    .eq('status', 'aprovada')
    .order('nome', { ascending: true });

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
