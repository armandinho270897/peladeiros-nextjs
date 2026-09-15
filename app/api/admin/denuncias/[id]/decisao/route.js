import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';
import { registrarAuditoria } from '@/lib/auditLog';
import { createNotification } from '@/lib/notify';

const STATUS_VALIDOS = ['em_analise', 'resolvida', 'arquivada'];

export async function POST(request, { params }) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { status, decisao } = await request.json().catch(() => ({}));
  if (!STATUS_VALIDOS.includes(status)) {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
  }

  const { data: antes } = await supabase.from('denuncias').select('status, decisao, autor_id').eq('id', params.id).maybeSingle();
  if (!antes) return NextResponse.json({ error: 'Denúncia não encontrada.' }, { status: 404 });

  const { data: denuncia, error } = await supabase
    .from('denuncias')
    .update({ status, decisao: decisao?.trim() || null, decidido_por: auth.user.id, decidido_em: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return errJson(error.message, 500);

  await registrarAuditoria({
    adminUserId: auth.user.id, acao: 'denuncia_decidida', alvoTipo: 'denuncia', alvoId: params.id,
    motivo: decisao?.trim() || null, dadosAntes: { status: antes.status }, dadosDepois: { status },
  });

  if (status === 'resolvida' && antes.autor_id) {
    await createNotification({
      userId: antes.autor_id, tipo: 'denuncia_resolvida',
      mensagem: 'Sua denúncia foi analisada pela administração.',
    });
  }

  return NextResponse.json(denuncia);
}
