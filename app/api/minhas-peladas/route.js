import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { jaAconteceu, aprovadosDe } from '@/lib/gameUtils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// "Agenda da Pelada" — nenhuma rota existente devolvia todas as
// confirmações do usuário (todo status) de uma vez; as demais sempre
// filtravam por um status só (ex: /api/perfil só olha 'aprovado').
// Devolve as peladas ainda não jogadas, agrupadas pelo status da PRÓPRIA
// confirmação — 'cancelado'/'rejeitado' ficam de fora (não é mais
// compromisso ativo), e peladas já encerradas ficam de fora também
// (esse é o histórico, que já existe no Perfil — aqui é só o que ainda
// vem pela frente).
export async function GET() {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const { data: minhasConfirmacoes } = await supabase
    .from('confirmacoes')
    .select('id, game_id, status, checkin_at')
    .eq('user_id', user.id)
    .in('status', ['aprovado', 'aguardando_confirmacao', 'espera', 'pendente']);

  if (!minhasConfirmacoes || minhasConfirmacoes.length === 0) {
    return NextResponse.json({ confirmadas: [], aguardandoConfirmacao: [], espera: [], pendentes: [] });
  }

  const gameIds = minhasConfirmacoes.map((c) => c.game_id);
  const { data: games } = await supabase
    .from('games')
    .select('id, local, bairro, data, horario, tipo, nivel, valor, vagas_totais, capitao, encerrada_em, confirmacoes(status)')
    .in('id', gameIds);

  const gamePorId = Object.fromEntries((games || []).map((g) => [g.id, g]));

  const resultado = { confirmadas: [], aguardandoConfirmacao: [], espera: [], pendentes: [] };
  const bucketPorStatus = {
    aprovado: 'confirmadas',
    aguardando_confirmacao: 'aguardandoConfirmacao',
    espera: 'espera',
    pendente: 'pendentes',
  };

  for (const c of minhasConfirmacoes) {
    const game = gamePorId[c.game_id];
    if (!game || game.encerrada_em || jaAconteceu(game)) continue;

    const item = {
      id: game.id,
      local: game.local,
      bairro: game.bairro,
      data: game.data,
      horario: game.horario,
      tipo: game.tipo,
      nivel: game.nivel,
      valor: game.valor,
      vagasTotais: game.vagas_totais,
      vagasOcupadas: aprovadosDe(game).length,
      capitao: game.capitao,
      minhaConfirmacaoId: c.id,
      minhaConfirmacaoStatus: c.status,
      checkinAt: c.checkin_at,
    };
    resultado[bucketPorStatus[c.status]].push(item);
  }

  for (const bucket of Object.values(resultado)) {
    bucket.sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));
  }

  return NextResponse.json(resultado);
}
