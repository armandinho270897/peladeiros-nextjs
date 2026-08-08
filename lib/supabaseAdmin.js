import { createClient } from '@supabase/supabase-js';

// Client de servidor, usado só nas rotas /api. Usa a service role key (nunca prefixada
// com NEXT_PUBLIC_, então nunca chega no navegador) — ela ignora RLS, então a validação
// de permissão (o PIN de 4 dígitos) continua sendo feita aqui no código da rota, não no banco.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
