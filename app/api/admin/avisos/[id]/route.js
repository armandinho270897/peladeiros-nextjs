import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';
import { registrarAuditoria } from '@/lib/auditLog';

export async function PATCH(request, { params }) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const { data: antes } = await supabase.from('avisos_admin').select('*').eq('id', params.id).maybeSingle();
  if (!antes) return NextResponse.json({ error: 'Aviso não encontrado.' }, { status: 404 });

  const campos = {};
  if (typeof body.publicado === 'boolean') campos.publicado = body.publicado;
  if (body.titulo?.trim()) campos.titulo = body.titulo.trim();
  if (body.mensagem?.trim()) campos.mensagem = body.mensagem.trim();
  if (body.publicoAlvo) campos.publico_alvo = body.publicoAlvo;
  if (body.inicioEm) campos.inicio_em = body.inicioEm;
  if ('fimEm' in body) campos.fim_em = body.fimEm || null;

  if (Object.keys(campos).length === 0) return NextResponse.json({ error: 'Nada pra atualizar.' }, { status: 400 });

  const { data: aviso, error } = await supabase.from('avisos_admin').update(campos).eq('id', params.id).select().single();
  if (error) return errJson(error.message, 500);

  await registrarAuditoria({
    adminUserId: auth.user.id, acao: 'aviso_atualizado', alvoTipo: 'aviso', alvoId: params.id,
    dadosAntes: antes, dadosDepois: aviso,
  });

  return NextResponse.json(aviso);
}
