import { createClient } from '@supabase/supabase-js';

// Cliente à parte, só pra pedir redefinição de senha — createBrowserClient
// (lib/supabase-browser.js) força flowType 'pkce' e não deixa sobrescrever
// (o valor é fixado depois do spread das opções). PKCE guarda a code_verifier
// no navegador que fez o pedido, então o link só funciona se for aberto
// nesse mesmo navegador/aparelho — na prática, quebra sempre que alguém abre
// o e-mail em outro lugar (navegador embutido do Instagram, outro
// navegador, outro celular), que é o caso comum, não raro. Com flowType
// 'implicit' o link carrega a sessão sozinho (via #access_token no
// fragmento), sem depender de nada salvo localmente — funciona em
// qualquer navegador/aparelho que abrir o link. Não persiste sessão nem
// mexe no client principal (login normal continua em PKCE, sem mudança).
export function createRecoveryClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: 'implicit',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
