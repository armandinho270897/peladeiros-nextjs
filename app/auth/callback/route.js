import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/';

  const supabase = createClient();
  let sessionOk = false;
  let lastError = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    sessionOk = !error;
    lastError = error;
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    sessionOk = !error;
    lastError = error;
  }

  if (!sessionOk) {
    if (!code && !token_hash) {
      // A Supabase pode devolver a sessão no fragmento da URL (#access_token=...)
      // em vez de ?code=. Fragmento nunca chega no servidor — só o navegador
      // consegue ler, então manda pra uma página cliente terminar o login.
      // O redirect abaixo não define fragmento próprio, então o navegador
      // preserva o #access_token=... original automaticamente.
      return NextResponse.redirect(`${origin}/auth/callback/complete?next=${encodeURIComponent(next)}`);
    }

    // Loga o erro real do servidor (visível em `vercel logs` / logs de runtime)
    // em vez de falhar em silêncio — foi exatamente essa falta de sinal que
    // escondeu a causa do bug anterior.
    console.error('[auth/callback] falha ao trocar código/token por sessão:', lastError?.message || lastError);
    const reason = lastError?.message ? encodeURIComponent(lastError.message) : 'unknown';
    return NextResponse.redirect(`${origin}/login?authError=${reason}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();

  if (!profile) {
    return NextResponse.redirect(`${origin}/completar-perfil?next=${encodeURIComponent(next)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
