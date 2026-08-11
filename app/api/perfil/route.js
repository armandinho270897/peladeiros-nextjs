import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { todayISO } from '@/lib/gameUtils';

export async function GET() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Complete seu perfil.' }, { status: 400 });

  const today = todayISO();

  const [{ count: peladasConfirmadas }, { count: peladasComoCapitao }, { data: avaliacoesRecebidas }, { data: minhasConfirmacoes }] = await Promise.all([
    supabase.from('confirmacoes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'aprovado'),
    supabase.from('games').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
    supabase.from('avaliacoes').select('nota').eq('avaliado_id', user.id),
    supabase.from('confirmacoes').select('game_id').eq('user_id', user.id).eq('status', 'aprovado'),
  ]);

  const totalAvaliacoes = (avaliacoesRecebidas || []).length;
  const notaMedia = totalAvaliacoes > 0
    ? avaliacoesRecebidas.reduce((s, a) => s + a.nota, 0) / totalAvaliacoes
    : null;

  const gameIds = (minhasConfirmacoes || []).map((c) => c.game_id);
  let historico = [];
  if (gameIds.length > 0) {
    const { data: games } = await supabase
      .from('games')
      .select('id, local, bairro, data, horario, capitao')
      .in('id', gameIds)
      .lt('data', today)
      .order('data', { ascending: false })
      .order('horario', { ascending: false });
    historico = games || [];
  }

  return NextResponse.json({
    profile,
    stats: { peladasConfirmadas, peladasComoCapitao, notaMedia, totalAvaliacoes },
    historico,
  });
}
