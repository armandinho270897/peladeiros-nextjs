import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import * as Sentry from '@sentry/nextjs';

// Times não têm o legado de peladas sem login (PIN) — sempre exige sessão
// e checa se é capitão aprovado desse time específico.
export async function authorizeTimeCaptain(timeId) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Faça login pra fazer isso.' };

  const { data: membro, error } = await supabase
    .from('time_membros')
    .select('id')
    .eq('time_id', timeId)
    .eq('user_id', user.id)
    .eq('papel', 'capitao')
    .eq('status', 'aprovado')
    .maybeSingle();

  // .maybeSingle() erra (em vez de só devolver null) quando mais de uma
  // linha bate — ou seja, o time acabou com dois capitães aprovados, o que
  // nunca deveria acontecer. Sinaliza isso em vez de tratar igual a "não é
  // capitão", senão o time fica travado sem ninguém saber o motivo.
  if (error) Sentry.captureException(new Error(`authorizeTimeCaptain: ${error.message} (timeId=${timeId})`));

  if (!membro) return { ok: false, status: 403, error: 'Só o capitão desse time pode fazer isso.' };
  return { ok: true, user };
}
