import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { ADMIN_USER_ID } from '@/lib/adminConfig';
import { NextResponse } from 'next/server';

// Fila de aprovação — só o dono do app vê as arenas pendentes.
export async function GET() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { data: arenas, error } = await supabase
    .from('arenas')
    .select('*')
    .eq('status', 'pendente')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set(arenas.map((a) => a.proposto_por_user_id).filter(Boolean))];
  const { data: proponentes } = userIds.length
    ? await supabase.from('profiles').select('id, nome').in('id', userIds)
    : { data: [] };
  const nomeDe = Object.fromEntries((proponentes || []).map((p) => [p.id, p.nome]));

  const comProponente = arenas.map((a) => ({
    ...a,
    proposto_por_nome: a.proposto_por_user_id ? nomeDe[a.proposto_por_user_id] || null : null,
  }));

  return NextResponse.json(comProponente);
}
