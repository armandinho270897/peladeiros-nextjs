import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { getSessionUser, timesQueCapitaneia } from '@/lib/organizerAuth';
import { ocupandoVagaDe } from '@/lib/gameUtils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function mesAtualISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
}

// Lista financeira unificada — linhas de "pelada avulsa" (games.valor +
// confirmacoes.pago) e linhas de "mensalidade" (times.mensalidade_valor +
// mensalidades do mês atual) lado a lado, mas cada linha marcada com seu
// `tipo` pra nunca serem somadas como se fossem a mesma cobrança.
export async function GET(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra ver isso.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const statusFiltro = searchParams.get('status'); // 'pendente' | 'pago' | null
  const tipoFiltro = searchParams.get('tipo'); // 'pelada' | 'mensalidade' | null

  const linhas = [];

  if (tipoFiltro !== 'mensalidade') {
    const { data: minhasPeladas } = await supabase
      .from('games')
      .select('id, local, data, valor, confirmacoes(id, nome, user_id, status, pago)')
      .eq('owner_id', user.id)
      .not('valor', 'is', null)
      .order('data', { ascending: false });
    for (const g of minhasPeladas || []) {
      for (const c of ocupandoVagaDe(g)) {
        linhas.push({
          tipo: 'pelada', id: `pelada-${c.id}`, confirmacaoId: c.id, gameId: g.id,
          referencia: g.local, data: g.data, nome: c.nome, valor: g.valor, pago: !!c.pago,
        });
      }
    }
  }

  if (tipoFiltro !== 'pelada') {
    const timeIds = await timesQueCapitaneia(user.id);
    if (timeIds.length > 0) {
      const mesAtual = mesAtualISO();
      const { data: times } = await supabase.from('times').select('id, nome, mensalidade_valor').in('id', timeIds);
      const timePorId = Object.fromEntries((times || []).map((t) => [t.id, t]));
      const { data: mensalistas } = await supabase
        .from('time_membros')
        .select('id, time_id, user_id, nome_convidado')
        .in('time_id', timeIds)
        .eq('status', 'aprovado')
        .eq('mensalista', true);
      const idsMensalistas = (mensalistas || []).map((m) => m.id);
      const idsPerfis = [...new Set((mensalistas || []).map((m) => m.user_id).filter(Boolean))];
      const [{ data: pagos }, { data: perfis }] = await Promise.all([
        idsMensalistas.length > 0
          ? supabase.from('mensalidades').select('time_membro_id').eq('mes_referencia', mesAtual).in('time_membro_id', idsMensalistas)
          : Promise.resolve({ data: [] }),
        idsPerfis.length > 0
          ? supabase.from('profiles').select('id, nome').in('id', idsPerfis)
          : Promise.resolve({ data: [] }),
      ]);
      const pagosSet = new Set((pagos || []).map((p) => p.time_membro_id));
      const nomePorUserId = Object.fromEntries((perfis || []).map((p) => [p.id, p.nome]));
      for (const m of mensalistas || []) {
        const time = timePorId[m.time_id];
        if (!time?.mensalidade_valor) continue;
        linhas.push({
          tipo: 'mensalidade', id: `mensalidade-${m.id}`, membroId: m.id, timeId: m.time_id,
          referencia: time.nome, data: mesAtual, nome: (m.user_id && nomePorUserId[m.user_id]) || m.nome_convidado || 'Sem nome',
          valor: time.mensalidade_valor, pago: pagosSet.has(m.id),
        });
      }
    }
  }

  const filtradas = statusFiltro === 'pendente' ? linhas.filter((l) => !l.pago)
    : statusFiltro === 'pago' ? linhas.filter((l) => l.pago)
    : linhas;

  const totais = {
    esperado: linhas.reduce((s, l) => s + l.valor, 0),
    recebido: linhas.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0),
    pendenteCount: linhas.filter((l) => !l.pago).length,
  };
  totais.pendente = Math.max(0, totais.esperado - totais.recebido);

  return NextResponse.json({ linhas: filtradas, totais });
}
