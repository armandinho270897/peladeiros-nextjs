import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';
import { getSessionUser } from '@/lib/desafiadoAuth';

// Estado completo da sessão — a tela ao vivo faz poll nisso a cada poucos
// segundos. Pública (mesmo padrão de /api/games/[id] e /api/times/[id]) —
// tem gente jogando o Desafiado sem conta nenhuma, exigir login pra só
// olhar o placar excluiria justamente quem tá jogando. Só as ações (gol,
// encerrar partida/sessão, adicionar jogador) exigem ser o criador.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request, { params }) {
  const user = await getSessionUser();

  const { id } = params;
  const { data: sessao, error } = await supabase.from('desafiado_sessoes').select('*').eq('id', id).maybeSingle();
  if (error) return errJson(error.message, 500);
  if (!sessao) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 });

  const [{ data: times }, { data: jogadores }, { data: partidaAtual }, { data: historico }] = await Promise.all([
    supabase.from('desafiado_times').select('*').eq('sessao_id', id).order('posicao_fila', { ascending: true }),
    supabase.from('desafiado_jogadores').select('*').eq('sessao_id', id),
    supabase.from('desafiado_partidas').select('*').eq('sessao_id', id).eq('status', 'em_andamento').maybeSingle(),
    supabase.from('desafiado_partidas').select('*').eq('sessao_id', id).eq('status', 'encerrada').order('encerrada_em', { ascending: false }),
  ]);

  const jogadoresPorTime = {};
  const listaEspera = [];
  for (const j of jogadores || []) {
    if (j.time_id) { (jogadoresPorTime[j.time_id] ||= []).push(j); }
    else listaEspera.push(j);
  }
  const timesComJogadores = (times || []).map((t) => ({ ...t, jogadores: jogadoresPorTime[t.id] || [] }));

  return NextResponse.json({
    sessao,
    times: timesComJogadores,
    listaEspera,
    partidaAtual: partidaAtual || null,
    historico: historico || [],
    souCriador: !!user && sessao.criado_por === user.id,
  });
}
