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

  // Duas consultas separadas (em vez de montar um `.or()` só, interpolando
  // `busca` na string do filtro) — `.ilike()` passa o valor como parâmetro
  // de verdade, sem chance de vírgula/parêntese na busca escapar do valor
  // e virar uma condição extra no filtro.
  const colunas = 'id, nome, whatsapp, bairro, role, status, created_at';
  const [porNome, porWhats] = await Promise.all([
    supabase.from('profiles').select(colunas).ilike('nome', `%${busca}%`).limit(30),
    supabase.from('profiles').select(colunas).ilike('whatsapp', `%${busca}%`).limit(30),
  ]);

  if (porNome.error) return errJson(porNome.error, 500);
  if (porWhats.error) return errJson(porWhats.error, 500);

  const vistos = new Set();
  const porNomeOuWhats = [...(porNome.data || []), ...(porWhats.data || [])]
    .filter((p) => (vistos.has(p.id) ? false : (vistos.add(p.id), true)))
    .slice(0, 30);

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
