import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';

const JANELAS_MS = { hoje: 24 * 3600 * 1000, '7d': 7 * 24 * 3600 * 1000, '30d': 30 * 24 * 3600 * 1000 };

export async function GET(request) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const admin = searchParams.get('admin');
  const tipo = searchParams.get('tipo');
  const alvoTipo = searchParams.get('alvoTipo');
  const periodo = searchParams.get('periodo');

  let query = supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(200);
  if (admin) query = query.eq('admin_user_id', admin);
  if (tipo) query = query.eq('acao', tipo);
  if (alvoTipo) query = query.eq('alvo_tipo', alvoTipo);
  if (periodo && JANELAS_MS[periodo]) query = query.gte('created_at', new Date(Date.now() - JANELAS_MS[periodo]).toISOString());

  const { data: logs, error } = await query;
  if (error) return errJson(error.message, 500);

  const adminIds = [...new Set((logs || []).map((l) => l.admin_user_id))];
  const { data: admins } = adminIds.length
    ? await supabase.from('profiles').select('id, nome').in('id', adminIds)
    : { data: [] };
  const nomeDe = Object.fromEntries((admins || []).map((p) => [p.id, p.nome]));

  return NextResponse.json((logs || []).map((l) => ({ ...l, admin_nome: nomeDe[l.admin_user_id] || 'Desconhecido' })));
}
