'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmtDate, normalizeWhatsapp } from '@/lib/gameUtils';

function abrirWhatsapp(whatsapp) {
  window.open(`https://wa.me/55${normalizeWhatsapp(whatsapp)}`, '_blank');
}

const fmtMoeda = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

const STATUS_LABEL = { agendada: 'Agendada', aguardando_encerramento: 'Aguardando encerramento', encerrada: 'Encerrada' };

export default function GerenciarPeladaPage({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(null); // id da linha em ação, pra desabilitar só o botão dela

  async function carregar() {
    setLoading(true);
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
    await carregar();
    setProcessando(null);
  }

  async function recusar(confirmacaoId) {
    setProcessando(confirmacaoId);
    await fetch(`/api/confirmacoes/${confirmacaoId}/rejeitar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    await carregar();
    setProcessando(null);
  }

  async function togglePago(confirmacaoId, pagoAtual) {
    if (pagoAtual && !window.confirm('Marcar como pendente de novo?')) return;
    if (!pagoAtual && !window.confirm('Confirmar que essa pessoa pagou?')) return;
    setProcessando(confirmacaoId);
    await fetch(`/api/confirmacoes/${confirmacaoId}/pagamento`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pago: !pagoAtual }) });
    await carregar();
    setProcessando(null);
  }

  async function cobrar(confirmacaoId) {
    setProcessando(confirmacaoId);
    await fetch(`/api/confirmacoes/${confirmacaoId}/cobrar-pagamento`, { method: 'POST' });
    setProcessando(null);
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

  const { game, status, confirmados, aguardandoConfirmacao, pendentesAprovacao, espera, cancelados, faltas, resumoPagamento } = data;

  return (
    <div className="pl-org-page">
      <div className="pl-org-header">
        <div>
          <h1>{game.local}</h1>
          <p>{fmtDate(game.data).dow} {fmtDate(game.data).dom} às {game.horario?.slice(0, 5)} · {game.bairro}</p>
        </div>
        <span className={`pl-org-badge ${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      <div className="pl-org-grid">
        <div className="pl-org-card">
          <span className="num">{confirmados.length}/{game.vagas_totais}</span>
          <div className="label">Confirmados</div>
        </div>
        <div className="pl-org-card">
          <span className={`num ${espera.length > 0 ? 'pl-org-warn' : ''}`}>{espera.length}</span>
          <div className="label">Lista de espera</div>
        </div>
        <div className="pl-org-card">
          <span className="num">{cancelados.length}</span>
          <div className="label">Cancelados</div>
        </div>
        <div className="pl-org-card">
          <span className={`num ${faltas.length > 0 ? 'pl-org-risk' : ''}`}>{faltas.length}</span>
          <div className="label">Faltas registradas</div>
        </div>
      </div>

      {resumoPagamento && (
        <div className="pl-org-card" style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 6 }}>Pagamento — {fmtMoeda(resumoPagamento.valor)} por pessoa</div>
          <div className="pl-progress-track"><div className="pl-progress-fill" style={{ width: `${resumoPagamento.esperado > 0 ? Math.round((resumoPagamento.recebido / resumoPagamento.esperado) * 100) : 0}%` }} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--paper-dim)' }}>
            <span>Recebido {fmtMoeda(resumoPagamento.recebido)}</span>
            <span>Esperado {fmtMoeda(resumoPagamento.esperado)}</span>
          </div>
        </div>
      )}

      <div className="pl-org-hero-actions" style={{ marginBottom: 20 }}>
        <Link href={`/pelada/${game.id}`} className="pl-tab active" style={{ textDecoration: 'none' }}>Abrir pelada completa</Link>
        <span style={{ fontSize: 12, color: 'var(--paper-dim)', display: 'block', marginTop: 6 }}>
          Escalação, editar pelada e encerrar partida ficam lá — mesmas telas de sempre.
        </span>
      </div>

      {pendentesAprovacao.length > 0 && (
        <div className="pl-org-section">
          <h3 className="pl-org-section-title">Aguardando aprovação</h3>
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

      {aguardandoConfirmacao.length > 0 && (
        <div className="pl-org-section">
          <h3 className="pl-org-section-title">Vaga reservada, aguardando confirmação do jogador</h3>
          {aguardandoConfirmacao.map((c) => (
            <div key={c.id} className="pl-org-confirm-row">
              <span>{c.nome}</span>
              {c.whatsapp && (
                <button type="button" className="pl-org-btn-mini whatsapp" onClick={() => abrirWhatsapp(c.whatsapp)}>WhatsApp</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pl-org-section">
        <h3 className="pl-org-section-title">Confirmados{resumoPagamento ? ' e pagamento' : ''}</h3>
        {confirmados.length === 0 && <p style={{ color: 'var(--paper-dim)', fontSize: 13 }}>Ninguém confirmado ainda.</p>}
        {confirmados.map((c) => (
          <div key={c.id} className="pl-org-confirm-row">
            <span>{c.nome}{c.presente === false ? ' · faltou' : ''}</span>
            <div className="pl-org-confirm-actions">
              {c.whatsapp && (
                <button type="button" className="pl-org-btn-mini whatsapp" onClick={() => abrirWhatsapp(c.whatsapp)}>WhatsApp</button>
              )}
              {resumoPagamento && (
                <>
                  <button type="button" className={`pl-org-btn-mini ${c.pago ? 'pago' : ''}`} disabled={processando === c.id} onClick={() => togglePago(c.id, c.pago)}>
                    {c.pago ? 'Pago ✓' : 'Marcar pago'}
                  </button>
                  {!c.pago && (
                    <button type="button" className="pl-org-btn-mini" disabled={processando === c.id} onClick={() => cobrar(c.id)}>Cobrar</button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {espera.length > 0 && (
        <div className="pl-org-section">
          <h3 className="pl-org-section-title">Lista de espera</h3>
          {espera.map((c) => (
            <div key={c.id} className="pl-org-confirm-row"><span>{c.nome}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
