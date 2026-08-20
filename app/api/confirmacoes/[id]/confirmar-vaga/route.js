import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { errJson } from '@/lib/apiError';

// Segundo clique da confirmação em duas etapas: só o próprio jogador,
// autenticado, pode confirmar a própria vaga.
export async function POST(request, { params }) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra confirmar sua vaga.' }, { status: 401 });

  if (!checkRateLimit(`confirmar-vaga:${user.id}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;
  const { data: confirmacao } = await supabase
    .from('confirmacoes')
    .select('id, user_id, status, prazo_confirmacao')
    .eq('id', id)
    .single();

  if (!confirmacao) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
  if (confirmacao.user_id !== user.id) return NextResponse.json({ error: 'Essa vaga não é sua.' }, { status: 403 });
  if (confirmacao.status !== 'aguardando_confirmacao') {
    return NextResponse.json({ error: 'Essa vaga não está mais aguardando confirmação.' }, { status: 409 });
  }
  if (confirmacao.prazo_confirmacao && new Date(confirmacao.prazo_confirmacao) < new Date()) {
    return NextResponse.json({ error: 'O prazo pra confirmar essa vaga já venceu.' }, { status: 409 });
  }

  const { data: atualizada, error } = await supabase
    .from('confirmacoes')
    .update({ status: 'aprovado', prazo_confirmacao: null })
    .eq('id', id)
    .select()
    .single();

  if (error) return errJson(error.message, 500);
  return NextResponse.json(atualizada);
}
