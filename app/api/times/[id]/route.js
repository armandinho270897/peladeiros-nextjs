import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } = params;

  const { data: time, error } = await supabase.from('times').select('*').eq('id', id).single();
  if (error || !time) return NextResponse.json({ error: 'Time não encontrado.' }, { status: 404 });

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  const { data: membrosRows } = await supabase
    .from('time_membros')
    .select('id, papel, status, user_id')
    .eq('time_id', id)
    .eq('status', 'aprovado');

  const souCapitao = !!user && (membrosRows || []).some((m) => m.papel === 'capitao' && m.user_id === user.id);

  let pendentesRows = [];
  if (souCapitao) {
    const { data } = await supabase.from('time_membros').select('id, user_id').eq('time_id', id).eq('status', 'pendente');
    pendentesRows = data || [];
  }

  // profiles não tem FK direta com time_membros (ambos só referenciam
  // auth.users) — PostgREST não consegue embedar automaticamente, então
  // busca à parte e junta em JS, mesmo padrão usado em toda rota que
  // cruza confirmacoes/time_membros com profiles.
  const idsRelevantes = [...new Set([...(membrosRows || []).map((m) => m.user_id), ...pendentesRows.map((p) => p.user_id)])];
  const { data: perfis } = idsRelevantes.length > 0
    ? await supabase.from('profiles').select('id, nome, foto_url, modalidade_principal, posicoes').in('id', idsRelevantes)
    : { data: [] };
  const perfilPorId = Object.fromEntries((perfis || []).map((p) => [p.id, p]));

  const membros = (membrosRows || []).map((m) => ({ ...m, profiles: perfilPorId[m.user_id] || null }));
  const pendentes = pendentesRows.map((p) => ({ ...p, profiles: perfilPorId[p.user_id] || null }));
  const capitao = membros.find((m) => m.papel === 'capitao')?.profiles || null;

  return NextResponse.json({
    time,
    capitao,
    membros,
    pendentes,
    souCapitao,
  });
}
