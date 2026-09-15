import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { authorizeAdmin } from '@/lib/adminAuth';

// Perfil resumido pra moderação: participações, presença, cancelamentos,
// faltas, denúncias recebidas e status da conta — não é a mesma resposta
// rica de /api/perfil (moral, conquistas, patente não importam aqui).
export async function GET(request, { params }) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', params.id).maybeSingle();
  if (error) return errJson(error.message, 500);
  if (!profile) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

  const { data: authUser } = await supabase.auth.admin.getUserById(params.id);

  const [
    { count: participacoes },
    { count: presencas },
    { count: cancelamentos },
    { count: faltas },
    { count: denunciasRecebidas },
  ] = await Promise.all([
    supabase.from('confirmacoes').select('id', { count: 'exact', head: true }).eq('user_id', params.id).eq('status', 'aprovado'),
    supabase.from('confirmacoes').select('id', { count: 'exact', head: true }).eq('user_id', params.id).eq('status', 'aprovado').eq('presente', true),
    supabase.from('confirmacoes').select('id', { count: 'exact', head: true }).eq('user_id', params.id).eq('status', 'cancelado'),
    supabase.from('confirmacoes').select('id', { count: 'exact', head: true }).eq('user_id', params.id).eq('presente', false),
    supabase.from('denuncias').select('id', { count: 'exact', head: true }).eq('alvo_tipo', 'jogador').eq('alvo_id', params.id),
  ]);

  return NextResponse.json({
    profile: { ...profile, email: authUser?.user?.email || null },
    stats: { participacoes: participacoes ?? 0, presencas: presencas ?? 0, cancelamentos: cancelamentos ?? 0, faltas: faltas ?? 0, denunciasRecebidas: denunciasRecebidas ?? 0 },
  });
}
