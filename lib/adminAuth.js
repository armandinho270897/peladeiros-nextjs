import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { ADMIN_USER_ID } from '@/lib/adminConfig';

// Autorização real (servidor) pra toda rota /api/admin/**. Mesma forma
// { ok, status, error, user } dos outros helpers de autorização do app
// (lib/timeAuth.js, lib/organizerAuth.js) — checa o papel salvo em
// profiles.role, não um e-mail/id hardcoded (só a promoção em si continua
// restrita ao ADMIN_USER_ID fixo, ver lib/auditLog.js e a rota de papel).
export async function authorizeAdmin() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Faça login pra acessar a administração.' };

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role !== 'admin') return { ok: false, status: 403, error: 'Sem permissão de administração.' };

  return { ok: true, user };
}

// Só a única conta fixa (mesma usada hoje pra aprovação de arena) pode
// promover/rebaixar outro usuário — não "qualquer admin". Regra explícita e
// protegida, não deduzida do papel de quem chama.
export function ehSuperAdmin(user) {
  return user?.id === ADMIN_USER_ID;
}
