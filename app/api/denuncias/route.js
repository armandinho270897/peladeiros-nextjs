import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';

const ALVOS_VALIDOS = ['jogador', 'pelada', 'arena'];
const MOTIVOS_VALIDOS = ['comportamento_abusivo', 'no_show_recorrente', 'informacao_falsa', 'conteudo_inadequado', 'problema_seguranca', 'outro'];

// Qualquer usuário logado denuncia jogador/pelada/arena. Pública (não é
// rota /api/admin) — só a análise/decisão é admin-only.
export async function POST(request) {
  if (!checkRateLimit(`denuncia:${getClientIp(request)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitas denúncias em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra denunciar.' }, { status: 401 });

  const body = await request.json();
  const { alvoTipo, alvoId, motivo, descricao } = body;

  if (!ALVOS_VALIDOS.includes(alvoTipo) || !alvoId || !MOTIVOS_VALIDOS.includes(motivo)) {
    return NextResponse.json({ error: 'Dados inválidos. Confere o tipo de alvo e o motivo.' }, { status: 400 });
  }

  const { data: denuncia, error } = await supabase
    .from('denuncias')
    .insert({
      alvo_tipo: alvoTipo,
      alvo_id: alvoId,
      autor_id: user.id,
      motivo,
      descricao: descricao?.trim().slice(0, 500) || null,
    })
    .select('id')
    .single();

  if (error) return errJson(error.message, 500);

  return NextResponse.json(denuncia, { status: 201 });
}
