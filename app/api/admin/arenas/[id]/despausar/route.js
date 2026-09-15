import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';
import { registrarAuditoria } from '@/lib/auditLog';

export async function POST(request, { params }) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: antes } = await supabase.from('arenas').select('status').eq('id', params.id).maybeSingle();

  const { data: arena, error } = await supabase.from('arenas').update({ status: 'aprovada' }).eq('id', params.id).select().single();
  if (error) return errJson(error.message, 500);

  await registrarAuditoria({
    adminUserId: auth.user.id, acao: 'arena_despausada', alvoTipo: 'arena', alvoId: params.id,
    dadosAntes: antes, dadosDepois: { status: 'aprovada' },
  });

  return NextResponse.json(arena);
}
