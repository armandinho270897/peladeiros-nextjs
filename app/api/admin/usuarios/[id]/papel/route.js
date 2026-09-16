import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin, ehSuperAdmin } from '@/lib/adminAuth';
import { registrarAuditoria } from '@/lib/auditLog';

// Promover/rebaixar admin é restrito a uma única conta fixa (o dono do
// app), não a "qualquer admin" — regra explícita contra auto-promoção. O
// banco também bloqueia troca de papel de qualquer outra sessão
// autenticada via trigger (migration 039); esta rota é a única porta de
// entrada possível, e só abre pra essa conta específica.
export async function POST(request, { params }) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!ehSuperAdmin(auth.user)) {
    return NextResponse.json({ error: 'Só o dono da plataforma pode alterar papéis de administração.' }, { status: 403 });
  }

  const { role } = await request.json().catch(() => ({}));
  if (!['user', 'admin'].includes(role)) return NextResponse.json({ error: 'Papel inválido.' }, { status: 400 });

  const { data: antes } = await supabase.from('profiles').select('role').eq('id', params.id).maybeSingle();
  if (!antes) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

  const { data: profile, error } = await supabase.from('profiles').update({ role }).eq('id', params.id).select().single();
  if (error) return errJson(error.message, 500);

  await registrarAuditoria({
    adminUserId: auth.user.id, acao: 'usuario_papel_alterado', alvoTipo: 'usuario', alvoId: params.id,
    dadosAntes: antes, dadosDepois: { role },
  });

  return NextResponse.json(profile);
}
