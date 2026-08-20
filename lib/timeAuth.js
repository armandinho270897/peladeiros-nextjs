import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';

// Times não têm o legado de peladas sem login (PIN) — sempre exige sessão
// e checa se é capitão aprovado desse time específico.
export async function authorizeTimeCaptain(timeId) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Faça login pra fazer isso.' };

  const { data: membro } = await supabase
    .from('time_membros')
    .select('id')
    .eq('time_id', timeId)
    .eq('user_id', user.id)
    .eq('papel', 'capitao')
    .eq('status', 'aprovado')
    .maybeSingle();

  if (!membro) return { ok: false, status: 403, error: 'Só o capitão desse time pode fazer isso.' };
  return { ok: true, user };
}
