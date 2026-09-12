'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fmtDate, normalizeWhatsapp, statusCheckin, formatHoraSP,
  checkinJanelaAberta, jaAconteceu, aprovadosDe, shareUrl,
} from '@/lib/gameUtils';
import { useToast } from '../../components/ToastProvider';
import TicketButton from '../../components/TicketButton';
import ManageModal from '../../components/ManageModal';
import EncerrarPartidaModal from '../../components/EncerrarPartidaModal';
import MontarTimesModal from '../../components/MontarTimesModal';

function abrirWhatsapp(whatsapp) {
  window.open(`https://wa.me/55${normalizeWhatsapp(whatsapp)}`, '_blank');
}

function shareGame(g) {
  const confirmadosCount = aprovadosDe(g).length;
  const restantes = Math.max(0, g.vagas_totais - confirmadosCount);
  const msg = `Pelada marcada!\n${g.local} (${g.bairro})\n${g.data} às ${g.horario}\n${restantes} vaga(s) livre(s) de ${g.vagas_totais}\nCapitão: ${g.capitao}\n\nConfirma presença: ${shareUrl(g.id)}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function shareResultado(g) {
  const msg = `⚽ Resultado da pelada!\n${g.local} (${g.bairro})\n${g.data}\n\nTime A ${g.placar_time_a} x ${g.placar_time_b} Time B\n\n${shareUrl(g.id)}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

const fmtMoeda = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

const STATUS_LABEL = { agendada: 'Agendada', aguardando_encerramento: 'Aguardando encerramento', encerrada: 'Encerrada' };

const CHECKIN_BADGE = {
  pontual: { label: 'Check-in', cls: 'pontual' },
  atrasado: { label: 'Atrasado', cls: 'atrasado' },
  presente_manual: { label: 'Presente (manual)', cls: 'pontual' },
  sem_checkin: { label: 'Sem check-in', cls: 'sem-checkin' },
  falta: { label: 'Falta', cls: 'falta' },
};

function CheckinBadge({ c, game }) {
  const s = statusCheckin(c, game);
  if (!s) return null;
  const info = CHECKIN_BADGE[s];
  const hora = c.checkin_at ? ` ${formatHoraSP(new Date(c.checkin_at))}` : '';
  return <span className={`pl-checkin-pill ${info.cls}`}>{info.label}{s === 'pontual' || s === 'atrasado' ? hora : ''}</span>;
}

// "Ver contato" — WhatsApp só aparece depois de um clique extra, em vez de
// ficar exposto direto na lista (organizador continua sendo o único que
// enxerga esse dado — mesma regra de sempre, só a exibição virou opt-in).
function ContatoRow({ whatsapp }) {
  const [aberto, setAberto] = useState(false);
  if (!whatsapp) return null;
  if (!aberto) {
    return <button type="button" className="pl-link-small" onClick={() => setAberto(true)}>Ver contato</button>;
  }
  return <button type="button" className="pl-org-btn-mini whatsapp" onClick={() => abrirWhatsapp(whatsapp)}>WhatsApp</button>;
}

const TABS = [
  { id: 'participantes', label: 'Participantes' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'jogo', label: 'Jogo' },
  { id: 'financeiro', label: 'Financeiro' },
];

export default function GerenciarPeladaPage({ params }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(null); // id da linha em ação, pra desabilitar só o botão dela
  const [tab, setTab] = useState('participantes');
  const [modal, setModal] = useState(null); // 'editar' | 'encerrar' | 'times'

  async function carregar(silent = false) {
    if (!silent) setLoading(true);
    const res = await fetch(`/api/organizar/pelada/${params.id}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error || 'Não foi possível carregar essa pelada.');
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [params.id]);

  async function aprovar(confirmacaoId) {
    setProcessando(confirmacaoId);
    await fetch(`/api/confirmacoes/${confirmacaoId}/aprovar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    await carregar(true);
    setProcessando(null);
  }

  async function recusar(confirmacaoId) {
    setProcessando(confirmacaoId);
    await fetch(`/api/confirmacoes/${confirmacaoId}/rejeitar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    await carregar(true);
    setProcessando(null);
  }

  async function togglePago(confirmacaoId, pagoAtual) {
    if (pagoAtual && !window.confirm('Marcar como pendente de novo?')) return;
    if (!pagoAtual && !window.confirm('Confirmar que essa pessoa pagou?')) return;
    setProcessando(confirmacaoId);
    await fetch(`/api/confirmacoes/${confirmacaoId}/pagamento`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pago: !pagoAtual }) });
    await carregar(true);
    setProcessando(null);
  }

  async function cobrar(confirmacaoId) {
    setProcessando(confirmacaoId);
    await fetch(`/api/confirmacoes/${confirmacaoId}/cobrar-pagamento`, { method: 'POST' });
    setProcessando(null);
    showToast('Cobrança enviada.');
  }

  async function marcarPresenca(confirmacaoId, presente) {
    setProcessando(confirmacaoId);
    await fetch(`/api/confirmacoes/${confirmacaoId}/presenca`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presente }) });
    await carregar(true);
    setProcessando(null);
  }

  async function cancelarPelada(gameId) {
    if (!window.confirm('Cancelar essa pelada? Isso avisa todo mundo confirmado e não pode ser desfeito.')) return;
    const res = await fetch(`/api/games/${gameId}`, { method: 'DELETE', body: JSON.stringify({ codigo: '' }) });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(result.error || 'Não consegui cancelar essa pelada.'); return; }
    window.location.href = '/organizar';
  }

  if (loading) {
    return (
      <div className="pl-org-page">
        {[1, 2, 3].map((i) => <div key={i} className="pl-skeleton" style={{ height: 60, marginBottom: 10, borderRadius: 6 }} />)}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="pl-org-page">
        <div className="pl-empty"><p>{erro}</p></div>
        <div style={{ textAlign: 'center' }}><Link href="/organizar" className="pl-tab active" style={{ textDecoration: 'none' }}>Voltar pro painel</Link></div>
      </div>
    );
  }

  const { game, status, confirmados, aguardandoConfirmacao, pendentesAprovacao, espera, cancelados, resumoPagamento } = data;

  const vagasOcupadas = confirmados.length + aguardandoConfirmacao.length;
  const vagasRestantes = Math.max(0, game.vagas_totais - vagasOcupadas);
  const checkinAberta = !game.encerrada_em && checkinJanelaAberta(game);
  const podeEncerrar = !game.encerrada_em && jaAconteceu(game);
  const podeCancelar = status !== 'encerrada';

  // Modais reaproveitados (edição/encerramento/times) esperam um `game`
  // com `.confirmacoes` (aprovadosDe filtra por status internamente) — a
  // API desse painel já separa por bucket, então "confirmados" já É a
  // lista de aprovados; só precisa virar `.confirmacoes` de novo pra bater
  // com o contrato desses componentes sem duplicar lógica de filtro.
  const gameParaModais = { ...game, confirmacoes: confirmados };

  const checkinContagem = confirmados.reduce((acc, c) => {
    const s = statusCheckin(c, game);
    if (s === 'pontual' || s === 'presente_manual') acc.chegaram++;
    else if (s === 'atrasado') acc.atrasados++;
    else if (s === 'falta') acc.ausentes++;
    else acc.pendentes++;
    return acc;
  }, { chegaram: 0, atrasados: 0, pendentes: 0, ausentes: 0 });

  const abasVisiveis = TABS.filter((t) => t.id !== 'financeiro' || resumoPagamento);
  const abaAtiva = abasVisiveis.some((t) => t.id === tab) ? tab : abasVisiveis[0]?.id;

  const pendente = resumoPagamento ? Math.max(0, resumoPagamento.esperado - resumoPagamento.recebido) : 0;

  return (
    <div className="pl-org-page">
      {/* 1. Cabeçalho compacto — nome/data/local/status numa linha, resumo
          de vagas/confirmados/check-in na outra. Os números por grupo
          (espera, cancelados, faltas) vivem só nas abas agora — sem
          repetir o mesmo dado em dois lugares. */}
      <div className="pl-org-header">
        <div>
          <h1>{game.local}</h1>
          <p>{fmtDate(game.data).dow} {fmtDate(game.data).dom} às {game.horario?.slice(0, 5)} · {game.bairro}</p>
        </div>
        <span className={`pl-org-badge ${status}`}>{STATUS_LABEL[status]}</span>
      </div>
      <p className="pl-org-resumo-linha">
        {vagasRestantes} vaga{vagasRestantes === 1 ? '' : 's'} livre{vagasRestantes === 1 ? '' : 's'} · {confirmados.length} confirmado{confirmados.length === 1 ? '' : 's'}
        {checkinAberta && <> · <span className="pl-org-checkin-tag">Check-in aberto</span></>}
      </p>

      {/* 2. Barra de ações — Editar/Cancelar sempre visíveis; Compartilhar e
          Encerrar viram um menu "⋯" em telas estreitas (mesmos botões,
          só trocam de lugar via CSS — sem duplicar a lógica de clique). */}
      <div className="pl-org-actionbar">
        <TicketButton compact onClick={() => setModal({ type: 'editar' })}>Editar</TicketButton>
        <button type="button" className="pl-btn-secondary pl-org-action-wide-only" onClick={() => shareGame(game)}>Compartilhar</button>
        {podeEncerrar && (
          <button type="button" className="pl-btn-secondary pl-org-action-wide-only" onClick={() => setModal({ type: 'encerrar' })}>Encerrar jogo</button>
        )}
        <details className="pl-org-action-overflow">
          <summary className="pl-btn-secondary">⋯ Mais</summary>
          <div className="pl-org-action-overflow-panel">
            <button type="button" className="pl-btn-secondary" onClick={() => shareGame(game)}>Compartilhar</button>
            {podeEncerrar && (
              <button type="button" className="pl-btn-secondary" onClick={() => setModal({ type: 'encerrar' })}>Encerrar jogo</button>
            )}
          </div>
        </details>
        {podeCancelar && (
          <button type="button" className="pl-btn-secondary pl-btn-danger pl-org-action-danger" onClick={() => cancelarPelada(game.id)}>Cancelar</button>
        )}
      </div>

      {/* Pendência de ação sempre visível, independente da aba — é a coisa
          mais urgente que existe nessa tela (alguém esperando resposta). */}
      {pendentesAprovacao.length > 0 && (
        <div className="pl-org-pendencia">
          <h3 className="pl-org-section-title">Aguardando aprovação ({pendentesAprovacao.length})</h3>
          {pendentesAprovacao.map((c) => (
            <div key={c.id} className="pl-org-confirm-row">
              <span>{c.nome}{c.mensagem ? ` — "${c.mensagem}"` : ''}</span>
              <div className="pl-org-confirm-actions">
                <button type="button" className="pl-org-btn-mini aprovar" disabled={processando === c.id} onClick={() => aprovar(c.id)}>Aprovar</button>
                <button type="button" className="pl-org-btn-mini recusar" disabled={processando === c.id} onClick={() => recusar(c.id)}>Recusar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Abas — reaproveita .pl-tabs/.pl-tab, mesmo visual do painel
          geral (/organizar). Financeiro some quando a pelada não tem
          valor definido (nada pra mostrar). */}
      <div className="pl-tabs" style={{ margin: '0 0 18px', padding: 0, maxWidth: 'none', flexWrap: 'wrap' }}>
        {abasVisiveis.map((t) => (
          <button key={t.id} type="button" className={`pl-tab ${abaAtiva === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* 4. Participantes */}
      {abaAtiva === 'participantes' && (
        <div className="pl-org-section">
          {aguardandoConfirmacao.length > 0 && (
            <div className="pl-org-section">
              <h3 className="pl-org-section-title">Aguardando confirmação do jogador ({aguardandoConfirmacao.length})</h3>
              {aguardandoConfirmacao.map((c) => (
                <div key={c.id} className="pl-org-confirm-row">
                  <span>{c.nome}</span>
                  <ContatoRow whatsapp={c.whatsapp} />
                </div>
              ))}
            </div>
          )}

          <details className="pl-org-group" open>
            <summary>Confirmados <span className="count">{confirmados.length}</span></summary>
            <div className="pl-org-group-body">
              {confirmados.length === 0 && <p className="pl-org-group-empty">Ninguém confirmado ainda.</p>}
              {confirmados.map((c) => (
                <div key={c.id} className="pl-org-confirm-row" style={{ flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.nome}{c.presente === false && ' · faltou'}
                  </span>
                  <ContatoRow whatsapp={c.whatsapp} />
                </div>
              ))}
            </div>
          </details>

          <details className="pl-org-group">
            <summary>Lista de espera <span className="count">{espera.length}</span></summary>
            <div className="pl-org-group-body">
              {espera.length === 0 && <p className="pl-org-group-empty">Ninguém na espera.</p>}
              {espera.map((c) => (
                <div key={c.id} className="pl-org-confirm-row"><span>{c.nome}</span></div>
              ))}
            </div>
          </details>

          <details className="pl-org-group">
            <summary>Cancelaram <span className="count">{cancelados.length}</span></summary>
            <div className="pl-org-group-body">
              {cancelados.length === 0 && <p className="pl-org-group-empty">Ninguém cancelou até agora.</p>}
              {cancelados.map((c) => (
                <div key={c.id} className="pl-org-confirm-row"><span>{c.nome}</span></div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* 5. Check-in */}
      {abaAtiva === 'checkin' && (
        <div className="pl-org-section">
          {checkinAberta && <div className="pl-org-checkin-banner">Check-in aberto — chegadas aparecem em tempo real.</div>}
          <div className="pl-org-grid">
            <div className="pl-org-card"><span className="num pl-org-good">{checkinContagem.chegaram}</span><div className="label">Chegaram</div></div>
            <div className="pl-org-card"><span className={`num ${checkinContagem.atrasados > 0 ? 'pl-org-warn' : ''}`}>{checkinContagem.atrasados}</span><div className="label">Atrasados</div></div>
            <div className="pl-org-card"><span className="num">{checkinContagem.pendentes}</span><div className="label">Pendentes</div></div>
            <div className="pl-org-card"><span className={`num ${checkinContagem.ausentes > 0 ? 'pl-org-risk' : ''}`}>{checkinContagem.ausentes}</span><div className="label">Ausentes</div></div>
          </div>
          {confirmados.length === 0 && <p style={{ color: 'var(--paper-dim)', fontSize: 13 }}>Ninguém confirmado ainda.</p>}
          {confirmados.map((c) => (
            <div key={c.id} className="pl-org-confirm-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{c.nome}<CheckinBadge c={c} game={game} /></span>
              {status !== 'encerrada' && (
                c.presente === false ? (
                  <button type="button" className="pl-org-btn-mini aprovar" disabled={processando === c.id} onClick={() => marcarPresenca(c.id, null)}>Desmarcar falta</button>
                ) : (
                  <button type="button" className="pl-org-btn-mini recusar" disabled={processando === c.id} onClick={() => marcarPresenca(c.id, false)}>Marcar falta</button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* 6. Jogo — jornada natural: times antes, placar/resultado depois. */}
      {abaAtiva === 'jogo' && (
        <div className="pl-org-section">
          {!game.encerrada_em ? (
            <>
              <h3 className="pl-org-section-title">Antes do jogo</h3>
              <p style={{ color: 'var(--paper-dim)', fontSize: 13, marginBottom: 10 }}>Monta os times pra já ficar pronto quando a bola rolar. Aparece na escalação assim que salvar.</p>
              <button type="button" className="pl-btn-secondary" style={{ flex: 'none' }} onClick={() => setModal({ type: 'times' })}>Montar times</button>

              {podeEncerrar && (
                <div style={{ marginTop: 22 }}>
                  <h3 className="pl-org-section-title">Encerrar</h3>
                  <p style={{ color: 'var(--paper-dim)', fontSize: 13, marginBottom: 10 }}>O horário já passou — encerra pra registrar presença e liberar as avaliações.</p>
                  <TicketButton compact onClick={() => setModal({ type: 'encerrar' })}>Encerrar partida</TicketButton>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="pl-org-section-title">Resultado</h3>
              {game.placar_time_a != null && game.placar_time_b != null ? (
                <div className="pl-org-card" style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontFamily: 'var(--font-display)', margin: '0 0 10px' }}>
                    Time A {game.placar_time_a} x {game.placar_time_b} Time B
                  </p>
                  <button type="button" className="pl-share-btn" onClick={() => shareResultado(game)}>Compartilhar resultado</button>
                </div>
              ) : (
                <p style={{ color: 'var(--paper-dim)', fontSize: 13 }}>Partida encerrada, sem placar registrado.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* 7. Financeiro — isolado das outras abas, resumo primeiro. */}
      {abaAtiva === 'financeiro' && resumoPagamento && (
        <div className="pl-org-section">
          <div className="pl-org-fin-totais">
            <div>Esperado<b>{fmtMoeda(resumoPagamento.esperado)}</b></div>
            <div>Recebido<b style={{ color: 'var(--neon)' }}>{fmtMoeda(resumoPagamento.recebido)}</b></div>
            <div>Pendente<b style={{ color: pendente > 0 ? 'var(--gold)' : 'var(--paper)' }}>{fmtMoeda(pendente)}</b></div>
          </div>
          <div className="pl-progress-track"><div className="pl-progress-fill" style={{ width: `${resumoPagamento.esperado > 0 ? Math.round((resumoPagamento.recebido / resumoPagamento.esperado) * 100) : 0}%` }} /></div>
          <p style={{ color: 'var(--paper-dim)', fontSize: 12, margin: '8px 0 14px' }}>{fmtMoeda(resumoPagamento.valor)} por pessoa</p>
          {confirmados.length === 0 && <p style={{ color: 'var(--paper-dim)', fontSize: 13 }}>Ninguém confirmado ainda.</p>}
          {confirmados.map((c) => (
            <div key={c.id} className="pl-org-fin-row">
              <div className="who"><b>{c.nome}</b></div>
              <div className="pl-org-confirm-actions">
                <button type="button" className={`pl-org-btn-mini ${c.pago ? 'pago' : ''}`} disabled={processando === c.id} onClick={() => togglePago(c.id, c.pago)}>
                  {c.pago ? 'Pago ✓' : 'Marcar pago'}
                </button>
                {!c.pago && (
                  <button type="button" className="pl-org-btn-mini" disabled={processando === c.id} onClick={() => cobrar(c.id)}>Cobrar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.type === 'editar' && (
        <ManageModal game={gameParaModais} onClose={() => setModal(null)} onSaved={() => { setModal(null); carregar(); }} />
      )}
      {modal?.type === 'encerrar' && (
        <EncerrarPartidaModal
          game={gameParaModais}
          onClose={() => setModal(null)}
          onEncerrada={() => { setModal(null); carregar(); showToast('Partida encerrada! Avaliações liberadas.'); }}
        />
      )}
      {modal?.type === 'times' && (
        <MontarTimesModal game={gameParaModais} onClose={() => setModal(null)} onSaved={() => { setModal(null); carregar(); showToast('Times salvos!'); }} />
      )}
    </div>
  );
}
