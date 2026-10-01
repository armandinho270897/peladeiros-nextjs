import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Guarda a assinatura (endpoint + chaves) que o navegador gerou — é só
// isso que o servidor precisa pra mandar push depois, em lib/webPush.js.
// Upsert por endpoint: o mesmo navegador pedindo de novo (ex: reinstalou,
// ou simplesmente carregou a página duas vezes) atualiza a linha em vez de
// duplicar ou dar erro de unique constraint.
export async function POST(request) {
  if (!(await checkRateLimit(`push:subscribe:${getClientIp(request)}`, 20, 5 * 60 * 1000))) {
    return NextResponse.json({ error: 'Muitas tentativas em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra ativar notificação.' }, { status: 401 });

  const { subscription } = await request.json().catch(() => ({}));
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const authKey = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'Assinatura de push inválida.' }, { status: 400 });
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint, p256dh, auth: authKey, user_agent: request.headers.get('user-agent')?.slice(0, 300) || null },
    { onConflict: 'endpoint' },
  );
  if (error) return errJson(error, 500);

  return NextResponse.json({ ok: true });
}
