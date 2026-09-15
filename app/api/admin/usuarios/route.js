import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';

// Busca por nome/whatsapp direto no banco; e-mail vem só do Supabase Auth
// (não existe coluna de e-mail em profiles), então busca por e-mail é feita
// em memória sobre uma janela de usuários — não escala pra base enorme, mas
// resolve o caso real (base pequena, zero-budget) sem indexar e-mail em
// lugar nenhum.
export async function GET(request) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const busca = (searchParams.get('busca') || '').trim();
  if (!busca) return NextResponse.json([]);

  const { data: porNomeOuWhats, error } = await supabase
    .from('profiles')
    .select('id, nome, whatsapp, bairro, role, status, created_at')
    .or(`nome.ilike.%${busca}%,whatsapp.ilike.%${busca}%`)
    .limit(30);

  if (error) return errJson(error.message, 500);

  if (porNomeOuWhats.length > 0 || !busca.includes('@')) {
    return NextResponse.json(porNomeOuWhats);
  }

  // Só tenta por e-mail se pareceu um e-mail e a busca direta não achou nada.
  const { data: usuariosAuth } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const idsComEmail = (usuariosAuth?.users || [])
    .filter((u) => u.email?.toLowerCase().includes(busca.toLowerCase()))
    .map((u) => u.id);
  if (idsComEmail.length === 0) return NextResponse.json([]);

  const { data: porEmail } = await supabase
    .from('profiles')
    .select('id, nome, whatsapp, bairro, role, status, created_at')
    .in('id', idsComEmail)
    .limit(30);

  return NextResponse.json(porEmail || []);
}
