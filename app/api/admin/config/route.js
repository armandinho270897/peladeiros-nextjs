import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';
import { registrarAuditoria } from '@/lib/auditLog';

export async function GET() {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabase.from('app_config').select('*').order('chave');
  if (error) return errJson(error.message, 500);
  return NextResponse.json(data);
}

export async function PATCH(request) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { chave, valor } = await request.json().catch(() => ({}));
  if (!chave || valor === undefined) return NextResponse.json({ error: 'Informe chave e valor.' }, { status: 400 });

  const { data: antes } = await supabase.from('app_config').select('valor').eq('chave', chave).maybeSingle();
  if (!antes) return NextResponse.json({ error: 'Configuração não encontrada.' }, { status: 404 });

  const { data: config, error } = await supabase
    .from('app_config')
    .update({ valor, atualizado_por: auth.user.id, atualizado_em: new Date().toISOString() })
    .eq('chave', chave)
    .select()
    .single();

  if (error) return errJson(error.message, 500);

  await registrarAuditoria({
    adminUserId: auth.user.id, acao: 'config_atualizada', alvoTipo: 'config', alvoId: chave,
    dadosAntes: antes, dadosDepois: { valor },
  });

  return NextResponse.json(config);
}
