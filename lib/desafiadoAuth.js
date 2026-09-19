import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';

// Usuário logado, ou null. A leitura da sessão é pública; isso só serve pra
// saber se quem está olhando é o criador.
export async function getSessionUser() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  return user || null;
}

// Controle de verdade (gol, encerrar partida, encerrar sessão) é só de
// quem criou — sem papel de "co-organizador", é uma sessão informal criada
// por uma pessoa só, igual authorizeOrganizerGame faz pra pelada.
export async function authorizeDesafiadoCriador(sessaoId) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Faça login pra fazer isso.' };

  const { data: sessao } = await supabase.from('desafiado_sessoes').select('criado_por').eq('id', sessaoId).maybeSingle();
  if (!sessao) return { ok: false, status: 404, error: 'Sessão não encontrada.' };
  if (sessao.criado_por !== user.id) {
    return { ok: false, status: 403, error: 'Só quem criou essa sessão pode fazer isso.' };
  }
  return { ok: true, user };
}
