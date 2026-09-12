import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { getSessionUser, timesQueCapitaneia } from '@/lib/organizerAuth';
import { aprovadosDe, ocupandoVagaDe, esperaDe, pendentesDe, jaAconteceu, fmtDate, periodoDe, PERIODO_LABEL } from '@/lib/gameUtils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Mínimo de peladas passadas pra um insight virar "padrão" em vez de
// coincidência — pedido explícito do briefing ("não tratar poucos dados
// como tendência").
const MIN_HISTORICO_INSIGHTS = 3;

function mesAtualISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
}

function moda(valores) {
  const contagem = {};
  for (const v of valores) { if (!v) continue; contagem[v] = (contagem[v] || 0) + 1; }
  let melhor = null, max = 0;
  for (const [v, n] of Object.entries(contagem)) { if (n > max) { max = n; melhor = v; } }
  return melhor;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra ver isso.' }, { status: 401 });

  const { data: minhasPeladas } = await supabase
    .from('games')
    .select('*, confirmacoes(*)')
    .eq('owner_id', user.id)
    .order('data', { ascending: true })
    .order('horario', { ascending: true });

  const timeIds = await timesQueCapitaneia(user.id);

  const organizoAlgo = (minhasPeladas?.length || 0) > 0 || timeIds.length > 0;
  if (!organizoAlgo) return NextResponse.json({ organizoAlgo: false });

  const todas = minhasPeladas || [];
  const futuras = todas.filter((g) => !jaAconteceu(g) && !g.encerrada_em);
  const passadas = todas.filter((g) => jaAconteceu(g) || g.encerrada_em);

  // ---- resumo das peladas futuras ----
  let confirmadosTotal = 0, vagasTotal = 0, esperaTotal = 0, pendentesAprovacaoTotal = 0;
  let valorEsperadoPeladas = 0, valorRecebidoPeladas = 0;
  const peladasResumo = futuras.map((g) => {
    const aprovados = aprovadosDe(g);
    const ocupando = ocupandoVagaDe(g);
    const espera = esperaDe(g);
    const pendentes = pendentesDe(g);
    confirmadosTotal += aprovados.length;
    vagasTotal += g.vagas_totais;
    esperaTotal += espera.length;
    pendentesAprovacaoTotal += pendentes.length;
    let valorEsperado = 0, valorRecebido = 0;
    if (g.valor) {
      valorEsperado = ocupando.length * g.valor;
      valorRecebido = ocupando.filter((c) => c.pago).length * g.valor;
      valorEsperadoPeladas += valorEsperado;
      valorRecebidoPeladas += valorRecebido;
    }
    return {
      id: g.id, local: g.local, bairro: g.bairro, data: g.data, horario: g.horario,
      vagasTotais: g.vagas_totais, confirmados: aprovados.length, restantes: Math.max(0, g.vagas_totais - ocupando.length),
      espera: espera.length, pendentesAprovacao: pendentes.length,
      valor: g.valor || null, valorEsperado, valorRecebido,
      encerrada: !!g.encerrada_em,
    };
  });

  // ---- faltas/presença (histórico) ----
  let faltasRecentes = 0, totalJulgados = 0, presentesCount = 0;
  const cancelamentosPorPelada = [];
  const ocupacaoHistoricaPorPelada = [];
  const contagemPresencaPorJogador = {}; // user_id -> {count, nome}
  for (const g of passadas) {
    const aprovados = aprovadosDe(g);
    const cancelados = (g.confirmacoes || []).filter((c) => c.status === 'cancelado');
    cancelamentosPorPelada.push(cancelados.length);
    ocupacaoHistoricaPorPelada.push({ ocupacao: g.vagas_totais > 0 ? aprovados.length / g.vagas_totais : 0, periodo: periodoDe(g.horario), dow: fmtDate(g.data).dow });
    for (const c of aprovados) {
      if (c.presente === false) faltasRecentes++;
      if (c.presente !== null && c.presente !== undefined) {
        totalJulgados++;
        if (c.presente !== false) presentesCount++;
      }
      if (c.user_id) {
        if (!contagemPresencaPorJogador[c.user_id]) contagemPresencaPorJogador[c.user_id] = { count: 0, nome: c.nome };
        if (c.presente !== false) contagemPresencaPorJogador[c.user_id].count += 1;
      }
    }
  }
  const taxaPresenca = totalJulgados > 0 ? Math.round((presentesCount / totalJulgados) * 100) : null;

  // ---- financeiro de mensalidades (times capitaneados) — mesmo cálculo de app/api/times/[id]/route.js ----
  let mensalidadesPendentes = 0, valorEsperadoMensal = 0, valorRecebidoMensal = 0;
  if (timeIds.length > 0) {
    const mesAtual = mesAtualISO();
    const { data: times } = await supabase.from('times').select('id, mensalidade_valor').in('id', timeIds);
    const valorPorTime = Object.fromEntries((times || []).map((t) => [t.id, t.mensalidade_valor || 0]));
    const { data: mensalistas } = await supabase
      .from('time_membros')
      .select('id, time_id')
      .in('time_id', timeIds)
      .eq('status', 'aprovado')
      .eq('mensalista', true);
    const idsMensalistas = (mensalistas || []).map((m) => m.id);
    const { data: pagos } = idsMensalistas.length > 0
      ? await supabase.from('mensalidades').select('time_membro_id').eq('mes_referencia', mesAtual).in('time_membro_id', idsMensalistas)
      : { data: [] };
    const pagosSet = new Set((pagos || []).map((p) => p.time_membro_id));
    for (const m of mensalistas || []) {
      const valor = valorPorTime[m.time_id] || 0;
      valorEsperadoMensal += valor;
      if (pagosSet.has(m.id)) valorRecebidoMensal += valor;
      else mensalidadesPendentes += 1;
    }
  }

  const valorEsperado = valorEsperadoPeladas + valorEsperadoMensal;
  const valorRecebido = valorRecebidoPeladas + valorRecebidoMensal;

  const proximaPelada = peladasResumo[0] || null;

  // ---- insights (só com histórico suficiente) ----
  let insights = { suficiente: passadas.length >= MIN_HISTORICO_INSIGHTS };
  if (insights.suficiente) {
    const ocupacaoMedia = Math.round(
      (ocupacaoHistoricaPorPelada.reduce((s, o) => s + o.ocupacao, 0) / ocupacaoHistoricaPorPelada.length) * 100
    );
    const mediaDesistencias = Math.round((cancelamentosPorPelada.reduce((s, n) => s + n, 0) / cancelamentosPorPelada.length) * 10) / 10;

    const porPeriodo = {};
    for (const o of ocupacaoHistoricaPorPelada) {
      if (!o.periodo) continue;
      if (!porPeriodo[o.periodo]) porPeriodo[o.periodo] = [];
      porPeriodo[o.periodo].push(o.ocupacao);
    }
    let periodoTop = null, mediaTop = -1;
    for (const [periodo, lista] of Object.entries(porPeriodo)) {
      if (lista.length < 2) continue; // não vira "padrão" com 1 pelada só
      const media = lista.reduce((s, v) => s + v, 0) / lista.length;
      if (media > mediaTop) { mediaTop = media; periodoTop = periodo; }
    }

    const jogadoresFrequentes = Object.entries(contagemPresencaPorJogador)
      .map(([userId, v]) => ({ userId, nome: v.nome, peladas: v.count }))
      .sort((a, b) => b.peladas - a.peladas)
      .slice(0, 5);

    insights = {
      suficiente: true,
      totalPeladasHistorico: passadas.length,
      taxaOcupacaoMedia: ocupacaoMedia,
      taxaComparecimento: taxaPresenca,
      mediaDesistenciasPorPelada: mediaDesistencias,
      periodoQueMaisEnche: periodoTop ? PERIODO_LABEL[periodoTop] : null,
      jogadoresFrequentes,
      modalidadeMaisFrequente: moda(todas.map((g) => g.tipo)),
      nivelMaisFrequente: moda(todas.map((g) => g.nivel)),
    };
  }

  return NextResponse.json({
    organizoAlgo: true,
    proximaPelada,
    resumo: {
      totalPeladasFuturas: futuras.length,
      confirmadosTotal, vagasTotal, esperaTotal, pendentesAprovacaoTotal,
      valorEsperado, valorRecebido, valorPendente: Math.max(0, valorEsperado - valorRecebido),
      mensalidadesPendentes,
      faltasRecentes, taxaPresenca,
    },
    peladas: peladasResumo,
    insights,
  });
}
