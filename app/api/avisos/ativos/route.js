import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';

// Pública — banner da Início. Sem sessão, só vê avisos 'todos'; logado,
// também vê 'organizadores' (se for dono de alguma pelada) e o do próprio
// bairro. Sem fan-out de notificação por usuário (ver migration 043) —
// cliente busca os avisos ativos e filtra pelo próprio contexto aqui, no
// servidor.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  const agora = new Date().toISOString();
  const { data: avisos, error } = await supabase
    .from('avisos_admin')
    .select('id, titulo, mensagem, publico_alvo')
    .eq('publicado', true)
    .lte('inicio_em', agora)
    .or(`fim_em.is.null,fim_em.gte.${agora}`)
    .order('created_at', { ascending: false });

  if (error) return errJson(error.message, 500);
  if (!avisos || avisos.length === 0) return NextResponse.json([]);

  const gerais = avisos.filter((a) => a.publico_alvo === 'todos');

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json(gerais);

  const { data: profile } = await supabase.from('profiles').select('bairro').eq('id', user.id).maybeSingle();
  const { count: ehOrganizador } = await supabase.from('games').select('id', { count: 'exact', head: true }).eq('owner_id', user.id);

  const relevantes = avisos.filter((a) => {
    if (a.publico_alvo === 'todos') return true;
    if (a.publico_alvo === 'organizadores') return (ehOrganizador ?? 0) > 0;
    if (a.publico_alvo.startsWith('bairro:')) return profile?.bairro === a.publico_alvo.slice(7);
    return false;
  });

  return NextResponse.json(relevantes);
}
