'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmtDate } from '@/lib/gameUtils';

const fmtMoeda = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

function EmptyOrganizar() {
  return (
    <div className="pl-empty">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="4" width="14" height="17" rx="2" stroke="var(--paper-dim)" strokeWidth="1.4" />
        <rect x="9" y="2.5" width="6" height="3" rx="1" fill="var(--paper-dim)" opacity="0.6" />
        <path d="M8.5 12.5h7M8.5 16h4.5" stroke="var(--paper-dim)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      </svg>
      <p>Ainda não tem nada pra organizar.<br />Cria uma pelada ou monta um time pra começar.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
        <Link href="/?criar=1" className="pl-tab active" style={{ textDecoration: 'none' }}>Criar pelada</Link>
        <Link href="/times" className="pl-tab" style={{ textDecoration: 'none' }}>Criar time</Link>
      </div>
    </div>
  );
}

function StatCard({ num, label, hint, tone }) {
  return (
    <div className="pl-org-card">
      <span className={`num ${tone ? `pl-org-${tone}` : ''}`}>{num}</span>
      <div className="label">{label}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export default function OrganizarPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('visao');
  const [financeiro, setFinanceiro] = useState(null);
  const [finFiltro, setFinFiltro] = useState('');
  const [finLoading, setFinLoading] = useState(false);

  useEffect(() => {
    fetch('/api/organizar')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'financeiro') return;
    setFinLoading(true);
    const qs = finFiltro ? `?status=${finFiltro}` : '';
    fetch(`/api/organizar/financeiro${qs}`)
      .then((r) => r.json())
      .then(setFinanceiro)
      .finally(() => setFinLoading(false));
  }, [tab, finFiltro]);

  if (loading) {
    return (
      <div className="pl-org-page">
        <div className="pl-org-header"><h1>Organizar</h1></div>
        <div className="pl-org-grid">
          {[1, 2, 3, 4].map((i) => <div key={i} className="pl-skeleton" style={{ height: 78, borderRadius: 6 }} />)}
        </div>
      </div>
    );
  }

  if (!data?.organizoAlgo) {
    return (
      <div className="pl-org-page">
        <div className="pl-org-header"><h1>Organizar</h1></div>
        <EmptyOrganizar />
      </div>
    );
  }

  const { proximaPelada, resumo, peladas, insights } = data;

  return (
    <div className="pl-org-page">
      <div className="pl-org-header">
        <div>
          <h1>Organizar</h1>
          <p>Suas peladas e times, num lugar só.</p>
        </div>
      </div>

      <div className="pl-tabs" style={{ margin: '0 0 18px', padding: 0, maxWidth: 'none' }}>
        <button type="button" className={`pl-tab ${tab === 'visao' ? 'active' : ''}`} onClick={() => setTab('visao')}>Visão geral</button>
        <button type="button" className={`pl-tab ${tab === 'financeiro' ? 'active' : ''}`} onClick={() => setTab('financeiro')}>Financeiro</button>
        <button type="button" className={`pl-tab ${tab === 'insights' ? 'active' : ''}`} onClick={() => setTab('insights')}>Insights</button>
      </div>

      {tab === 'visao' && (
        <>
          {proximaPelada && (
            <div className="pl-org-hero">
              <p className="pl-org-hero-label">Próxima pelada</p>
              <h2 className="pl-org-hero-title">{proximaPelada.local}</h2>
              <p className="pl-org-hero-meta">
                {fmtDate(proximaPelada.data).dow} {fmtDate(proximaPelada.data).dom} às {proximaPelada.horario?.slice(0, 5)} · {proximaPelada.bairro}
                {' · '}{proximaPelada.confirmados}/{proximaPelada.vagasTotais} confirmados
                {proximaPelada.espera > 0 && ` · ${proximaPelada.espera} na espera`}
                {proximaPelada.pendentesAprovacao > 0 && ` · ${proximaPelada.pendentesAprovacao} aguardando aprovação`}
              </p>
              <div className="pl-org-hero-actions">
                <Link href={`/organizar/${proximaPelada.id}`} className="pl-tab active" style={{ textDecoration: 'none' }}>Gerenciar essa pelada</Link>
              </div>
            </div>
          )}

          <div className="pl-org-grid">
            <StatCard num={resumo.totalPeladasFuturas} label="Peladas agendadas" hint="Organizadas por você, ainda por vir." />
            <StatCard num={`${resumo.confirmadosTotal}/${resumo.vagasTotal}`} label="Ocupação total" hint="Confirmados sobre vagas, somando todas." />
            <StatCard num={resumo.esperaTotal} label="Na lista de espera" tone={resumo.esperaTotal > 0 ? 'warn' : undefined} />
            <StatCard num={resumo.pendentesAprovacaoTotal} label="Aguardando aprovação" tone={resumo.pendentesAprovacaoTotal > 0 ? 'warn' : undefined} hint={resumo.pendentesAprovacaoTotal > 0 ? 'Pedidos pra entrar que ainda não foram respondidos.' : undefined} />
            <StatCard num={fmtMoeda(resumo.valorPendente)} label="Valor pendente" tone={resumo.valorPendente > 0 ? 'warn' : 'good'} hint={`Esperado ${fmtMoeda(resumo.valorEsperado)} · Recebido ${fmtMoeda(resumo.valorRecebido)}`} />
            <StatCard num={resumo.taxaPresenca !== null ? `${resumo.taxaPresenca}%` : '—'} label="Taxa de presença" hint={resumo.taxaPresenca === null ? 'Ainda sem peladas encerradas pra calcular.' : `${resumo.faltasRecentes} falta(s) registrada(s) no histórico.`} />
          </div>

          {resumo.mensalidadesPendentes > 0 && (
            <div className="pl-org-card" style={{ marginBottom: 16, borderColor: 'rgba(255,197,61,0.4)' }}>
              <span className="num pl-org-warn">{resumo.mensalidadesPendentes}</span>
              <div className="label">Mensalidade(s) pendente(s) este mês</div>
              <div className="hint">Veja quem está em dia na aba Financeiro, ou no time diretamente.</div>
            </div>
          )}

          <div className="pl-org-section">
            <h3 className="pl-org-section-title">Suas peladas</h3>
            {peladas.length === 0 && <p style={{ color: 'var(--paper-dim)', fontSize: 13 }}>Nenhuma pelada agendada no momento.</p>}
            {peladas.map((p) => (
              <Link key={p.id} href={`/organizar/${p.id}`} className="pl-org-pelada-row">
                <div className="info">
                  <b>{p.local}</b>
                  <span>{fmtDate(p.data).dow} {fmtDate(p.data).dom} · {p.horario?.slice(0, 5)}</span>
                </div>
                <div className="metrics">
                  <div className="metric"><b>{p.confirmados}/{p.vagasTotais}</b>vagas</div>
                  {p.espera > 0 && <div className="metric"><b style={{ color: 'var(--gold)' }}>{p.espera}</b>espera</div>}
                  {p.pendentesAprovacao > 0 && <div className="metric"><b style={{ color: 'var(--gold)' }}>{p.pendentesAprovacao}</b>pedidos</div>}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {tab === 'financeiro' && (
        <div className="pl-org-section">
          <div className="pl-org-fin-filters">
            <button type="button" className={`pl-tab ${finFiltro === '' ? 'active' : ''}`} onClick={() => setFinFiltro('')}>Todos</button>
            <button type="button" className={`pl-tab ${finFiltro === 'pendente' ? 'active' : ''}`} onClick={() => setFinFiltro('pendente')}>Pendentes</button>
            <button type="button" className={`pl-tab ${finFiltro === 'pago' ? 'active' : ''}`} onClick={() => setFinFiltro('pago')}>Pagos</button>
          </div>
          <p style={{ color: 'var(--paper-dim)', fontSize: 12, marginTop: -4, marginBottom: 14 }}>Controle interno do app — não é um sistema bancário nem substitui recibo.</p>
          {finLoading || !financeiro ? (
            [1, 2, 3].map((i) => <div key={i} className="pl-skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 6 }} />)
          ) : (
            <>
              <div className="pl-org-fin-totais">
                <div>Esperado<b>{fmtMoeda(financeiro.totais.esperado)}</b></div>
                <div>Recebido<b style={{ color: 'var(--neon)' }}>{fmtMoeda(financeiro.totais.recebido)}</b></div>
                <div>Pendente<b style={{ color: financeiro.totais.pendente > 0 ? 'var(--gold)' : 'var(--paper)' }}>{fmtMoeda(financeiro.totais.pendente)}</b></div>
              </div>
              {financeiro.linhas.length === 0 && <p style={{ color: 'var(--paper-dim)', fontSize: 13 }}>Nada por aqui com esse filtro.</p>}
              {financeiro.linhas.map((l) => (
                <div key={l.id} className="pl-org-fin-row">
                  <div className="who">
                    <b>{l.nome}</b>
                    <span>{l.referencia} · {l.tipo === 'mensalidade' ? 'mensalidade' : 'pelada avulsa'}</span>
                  </div>
                  <span className={`valor ${l.pago ? 'pago' : 'pendente'}`}>{fmtMoeda(l.valor)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'insights' && (
        <div className="pl-org-section">
          {!insights.suficiente ? (
            <p style={{ color: 'var(--paper-dim)', fontSize: 13 }}>
              Ainda não há histórico suficiente pra insights confiáveis — precisa de pelo menos 3 peladas já realizadas. Continua organizando que isso aqui enche sozinho.
            </p>
          ) : (
            <div className="pl-org-card">
              <div className="pl-org-insight-item"><span>Taxa de ocupação média</span><span>{insights.taxaOcupacaoMedia}%</span></div>
              <div className="pl-org-insight-item"><span>Taxa de comparecimento</span><span>{insights.taxaComparecimento !== null ? `${insights.taxaComparecimento}%` : '—'}</span></div>
              <div className="pl-org-insight-item"><span>Média de desistências por pelada</span><span>{insights.mediaDesistenciasPorPelada}</span></div>
              {insights.periodoQueMaisEnche && <div className="pl-org-insight-item"><span>Período que mais enche</span><span>{insights.periodoQueMaisEnche}</span></div>}
              {insights.modalidadeMaisFrequente && <div className="pl-org-insight-item"><span>Modalidade mais frequente</span><span>{insights.modalidadeMaisFrequente}</span></div>}
              {insights.nivelMaisFrequente && <div className="pl-org-insight-item"><span>Nível mais frequente</span><span>{insights.nivelMaisFrequente}</span></div>}
            </div>
          )}
          {insights.suficiente && insights.jogadoresFrequentes?.length > 0 && (
            <div className="pl-org-card" style={{ marginTop: 12 }}>
              <div className="label" style={{ marginBottom: 8 }}>Jogadores mais frequentes</div>
              {insights.jogadoresFrequentes.map((j) => (
                <div key={j.userId} className="pl-org-insight-item"><span>{j.nome}</span><span>{j.peladas} pelada(s)</span></div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
