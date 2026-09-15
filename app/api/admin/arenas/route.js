import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';

// Fila de arenas pra administração — por padrão só 'pendente' (fila de
// trabalho), mas aceita ?status= pra ver aprovadas/rejeitadas/pausadas.
export async function GET(request) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pendente';

  let query = supabase.from('arenas').select('*').order('created_at', { ascending: true });
  if (status !== 'todas') query = query.eq('status', status);

  const { data: arenas, error } = await query;
  if (error) return errJson(error.message, 500);

  const userIds = [...new Set(arenas.map((a) => a.proposto_por_user_id).filter(Boolean))];
  const { data: proponentes } = userIds.length
    ? await supabase.from('profiles').select('id, nome').in('id', userIds)
    : { data: [] };
  const nomeDe = Object.fromEntries((proponentes || []).map((p) => [p.id, p.nome]));

  return NextResponse.json(arenas.map((a) => ({ ...a, proposto_por_nome: a.proposto_por_user_id ? nomeDe[a.proposto_por_user_id] || null : null })));
}
