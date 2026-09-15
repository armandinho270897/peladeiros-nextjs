import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';
import { registrarAuditoria } from '@/lib/auditLog';

const TIPOS_VALIDOS = ['quadra escolar', 'arena', 'quadra pública', 'rua', 'campo', 'estádio'];

export async function POST(request, { params }) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { nome, endereco, bairro, tipo } = body;
  if (!nome || !endereco || !bairro || !TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: 'Dados inválidos. Confere se preencheu tudo e escolheu um tipo válido.' }, { status: 400 });
  }

  const { data: antes } = await supabase.from('arenas').select('nome, endereco, bairro, tipo').eq('id', params.id).maybeSingle();

  const { data: arena, error } = await supabase.from('arenas').update({ nome, endereco, bairro, tipo }).eq('id', params.id).select().single();
  if (error) return errJson(error.message, 500);

  await registrarAuditoria({
    adminUserId: auth.user.id, acao: 'arena_editada', alvoTipo: 'arena', alvoId: params.id,
    dadosAntes: antes, dadosDepois: { nome, endereco, bairro, tipo },
  });

  return NextResponse.json(arena);
}
