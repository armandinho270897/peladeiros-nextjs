import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';

// Escopado por user_id além do endpoint — mesmo que alguém adivinhasse o
// endpoint de outra pessoa (não é segredo, mas ainda assim), só apaga a
// própria assinatura, nunca a de outro usuário.
export async function POST(request) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const { endpoint } = await request.json().catch(() => ({}));
  if (!endpoint) return NextResponse.json({ error: 'Faltou o endpoint.' }, { status: 400 });

  const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);
  if (error) return errJson(error, 500);

  return NextResponse.json({ ok: true });
}
