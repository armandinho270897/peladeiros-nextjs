import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Client de servidor pra Route Handlers e Server Components — usa a anon key
// (lê a sessão do usuário via cookies, não bypassa RLS como o supabaseAdmin).
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // chamado de dentro de um Server Component (não pode setar cookie) —
            // o middleware já cuida de renovar a sessão nesses casos.
          }
        },
      },
    }
  );
}
