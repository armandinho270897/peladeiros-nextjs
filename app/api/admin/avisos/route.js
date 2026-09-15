import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';
import { registrarAuditoria } from '@/lib/auditLog';

export async function GET() {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabase.from('avisos_admin').select('*').order('created_at', { ascending: false });
  if (error) return errJson(error.message, 500);
  return NextResponse.json(data);
}

// Nasce sempre não publicado (publicado=false) — a rota PATCH exige uma
// chamada separada pra publicar, forçando o admin a rever antes de
// qualquer um ver o aviso ("exigir prévia antes de publicar").
export async function POST(request) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { titulo, mensagem, publicoAlvo, inicioEm, fimEm } = await request.json().catch(() => ({}));
  if (!titulo?.trim() || !mensagem?.trim()) {
    return NextResponse.json({ error: 'Preenche título e mensagem.' }, { status: 400 });
  }

  const { data: aviso, error } = await supabase
    .from('avisos_admin')
    .insert({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      publico_alvo: publicoAlvo || 'todos',
      inicio_em: inicioEm || new Date().toISOString(),
      fim_em: fimEm || null,
      publicado: false,
      criado_por: auth.user.id,
    })
    .select()
    .single();

  if (error) return errJson(error.message, 500);

  await registrarAuditoria({ adminUserId: auth.user.id, acao: 'aviso_criado', alvoTipo: 'aviso', alvoId: aviso.id, dadosDepois: aviso });

  return NextResponse.json(aviso, { status: 201 });
}
