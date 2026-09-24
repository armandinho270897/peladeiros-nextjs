'use client';
import { useCallback, useEffect, useState } from 'react';
import BackLink from '../../components/BackLink';
import TicketButton from '../../components/TicketButton';
import PlayerSearch from '../../components/PlayerSearch';
import { useToast } from '../../components/ToastProvider';

const POLL_MS = 5000;

function nomeTime(t) {
  return `Time ${t.numero}`;
}

// Tempo restante calculado no cliente, igual todo relógio do app — nunca
// depende de um servidor "tickando" nada, só de iniciada_em + duracao_min
// gravados no banco (mesmo princípio de lib/gameUtils.js).
function tempoRestanteMs(partida) {
  if (!partida) return 0;
  const fim = new Date(partida.iniciada_em).getTime() + partida.duracao_min * 60 * 1000;
  return fim - Date.now();
}

function formatarMMSS(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function DesafiadoClient({ id }) {
  const { showToast } = useToast();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [modalDesempate, setModalDesempate] = useState(false);
  const [modalPenaltis, setModalPenaltis] = useState(false);
  const [coinFlip, setCoinFlip] = useState(null);
  const [adicionandoJogador, setAdicionandoJogador] = useState(false);
  const [modalGol, setModalGol] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/desafiado/${id}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) return;
      setDados(await res.json());
    } catch {
      // sem sinal: mantém o que já está na tela e tenta de novo no próximo poll
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Nunca lança: falha de rede vira resposta com erro, então o busy sempre volta.
  async function chamar(caminho, corpo) {
    try {
      const res = await fetch(`/api/desafiado/${id}${caminho}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo ?? {}),
      });
      const result = await res.json().catch(() => ({}));
      return { res, result };
    } catch {
      return { res: { ok: false, status: 0 }, result: { error: 'Sem conexão. Confere a internet e tenta de novo.' } };
    }
  }

  async function marcarGol(timeId, jogadorId, desfazer = false) {
    setBusy(true);
    const { res, result } = await chamar('/gol', { timeId, jogadorId, desfazer });
    setBusy(false);
    if (!res.ok) { showToast(result.error || (desfazer ? 'Não consegui desfazer o gol.' : 'Não consegui marcar o gol.')); return; }
    load(true);
  }

  // Time com um jogador só (ex: Futebol de Rua 1x1) não precisa perguntar
  // quem marcou — só pode ter sido ele.
  function abrirMarcarGol(time) {
    if (time.jogadores.length === 1) { marcarGol(time.id, time.jogadores[0].id); return; }
    setModalGol(time);
  }

  async function encerrarPartida(criterioDesempate, vencedorPenaltisTimeId) {
    setBusy(true);
    const { res, result } = await chamar('/encerrar-partida', { criterioDesempate, vencedorPenaltisTimeId });
    setBusy(false);
    if (res.status === 409 && result.empatado) {
      if (result.criterioDesempate === 'penaltis') { setModalPenaltis(true); return; }
      setModalDesempate(true);
      return;
    }
    if (!res.ok) { showToast(result.error || 'Não consegui encerrar a partida.'); return; }
    setModalDesempate(false);
    setModalPenaltis(false);
    if (result.prorrogacao) { showToast('Prorrogação! O cronômetro reiniciou.'); load(true); return; }
    if (result.coinFlip) {
      setCoinFlip(result.coinFlip);
      setTimeout(() => setCoinFlip(null), 3000);
    }
    load(true);
  }

  async function adicionarJogador(p) {
    setBusy(true);
    const { res, result } = await chamar('/jogadores', { id: p.id, nome: p.nome });
    setBusy(false);
    if (!res.ok) { showToast(result.error || 'Não consegui adicionar.'); return; }
    showToast(result.timeFormado ? `${p.nome} entrou — Time ${result.timeFormado.numero} formado e foi pro final da fila!` : `${p.nome} entrou na lista de espera.`);
    load(true);
  }

  async function encerrarSessao() {
    if (!confirm('Encerrar o Desafiado? Ninguém mais vai poder marcar gol ou entrar depois disso.')) return;
    setBusy(true);
    const { res, result } = await chamar('/encerrar-sessao');
    setBusy(false);
    if (!res.ok) { showToast(result.error || 'Não consegui encerrar.'); return; }
    showToast('Desafiado encerrado.');
    load(true);
  }

  if (loading) {
    return (
      <div>
        <div className="pl-header"><BackLink href="/">Início</BackLink></div>
        <div className="pl-list" style={{ paddingTop: 14 }}><div className="pl-skeleton" style={{ height: 240 }} /></div>
      </div>
    );
  }

  if (notFound || !dados) {
    return (
      <div>
        <div className="pl-header"><BackLink href="/">Início</BackLink></div>
        <div className="pl-empty">
          <p>{notFound ? 'Esse Desafiado não existe (ou já expirou).' : 'Não consegui carregar agora. Tentando de novo...'}</p>
        </div>
      </div>
    );
  }

  const { sessao, times, listaEspera, partidaAtual, souCriador, artilheiros } = dados;
  const timeA = partidaAtual && times.find((t) => t.id === partidaAtual.time_a_id);
  const timeB = partidaAtual && times.find((t) => t.id === partidaAtual.time_b_id);
  const fila = times.filter((t) => partidaAtual && t.id !== partidaAtual.time_a_id && t.id !== partidaAtual.time_b_id);
  const ranking = [...times].sort((a, b) => b.vitorias - a.vitorias || b.gols_marcados - a.gols_marcados);
  // `agora` só existe pra forçar o recálculo a cada segundo (tick abaixo) —
  // tempoRestanteMs já lê Date.now() sozinho, mesmo padrão de
  // GameCard.js (agoraCheckin/void).
  void agora;
  const restanteMs = partidaAtual ? tempoRestanteMs(partidaAtual) : 0;
  const tempoEsgotado = partidaAtual && restanteMs <= 0;

  return (
    <div>
      <div className="pl-header"><BackLink href="/">Início</BackLink></div>

      <div className="pl-desafiado-topo">
        <h2 className="pl-hero-title">Desafiado</h2>
        <p className="meta">{sessao.local} · {sessao.bairro} · {sessao.tipo_jogo}</p>
        {sessao.status === 'encerrada' && <span className="pl-admin-badge">encerrado</span>}
      </div>

      {partidaAtual && (
        <div className="pl-list" style={{ paddingTop: 10 }}>
          <div className="pl-desafiado-placar-card">
            <div className={`pl-desafiado-cronometro ${tempoEsgotado ? 'esgotado' : ''}`}>
              {tempoEsgotado ? 'Tempo esgotado' : formatarMMSS(restanteMs)}
            </div>
            <div className="pl-desafiado-placar-row">
              <div className="pl-desafiado-time-col">
                <span className="pl-desafiado-time-nome">{nomeTime(timeA)}</span>
                <span className="pl-desafiado-gols">{partidaAtual.gols_time_a}</span>
                {souCriador && (
                  <div className="pl-desafiado-gol-btns">
                    <button type="button" className="pl-btn-secondary" disabled={busy} onClick={() => abrirMarcarGol(timeA)}>+1 gol</button>
                    <button type="button" className="pl-btn-secondary" aria-label={`Desfazer um gol do ${nomeTime(timeA)}`} disabled={busy || partidaAtual.gols_time_a === 0} onClick={() => marcarGol(timeA.id, null, true)}>−1</button>
                  </div>
                )}
              </div>
              <span className="pl-desafiado-x">x</span>
              <div className="pl-desafiado-time-col">
                <span className="pl-desafiado-time-nome">{nomeTime(timeB)}</span>
                <span className="pl-desafiado-gols">{partidaAtual.gols_time_b}</span>
                {souCriador && (
                  <div className="pl-desafiado-gol-btns">
                    <button type="button" className="pl-btn-secondary" disabled={busy} onClick={() => abrirMarcarGol(timeB)}>+1 gol</button>
                    <button type="button" className="pl-btn-secondary" aria-label={`Desfazer um gol do ${nomeTime(timeB)}`} disabled={busy || partidaAtual.gols_time_b === 0} onClick={() => marcarGol(timeB.id, null, true)}>−1</button>
                  </div>
                )}
              </div>
            </div>
            {souCriador && (
              <TicketButton compact style={{ width: '100%', marginTop: 10 }} disabled={busy} onClick={() => encerrarPartida()}>
                Encerrar partida
              </TicketButton>
            )}
          </div>
        </div>
      )}

      {fila.length > 0 && (
        <div className="pl-list" style={{ paddingTop: 0 }}>
          <div className="pl-card" style={{ display: 'block' }}>
            <div className="pl-pending-title pl-section-title">Fila de espera pra jogar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {fila.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--paper-dim)' }}>
                  <span>{i + 1}º — {nomeTime(t)}</span>
                  <span>{t.jogadores.map((j) => j.nome).join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {listaEspera.length > 0 && (
        <div className="pl-list" style={{ paddingTop: 0 }}>
          <div className="pl-card" style={{ display: 'block' }}>
            <div className="pl-pending-title pl-section-title">Esperando fechar um time ({listaEspera.length}/{sessao.tamanho_time})</div>
            <p style={{ fontSize: 13, color: 'var(--paper-dim)', margin: 0 }}>{listaEspera.map((j) => j.nome).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="pl-list" style={{ paddingTop: 0 }}>
        <div className="pl-card" style={{ display: 'block' }}>
          <div className="pl-pending-title pl-section-title">Placar da sessão</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ranking.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--paper)' }}>{nomeTime(t)}</span>
                <span style={{ color: 'var(--paper-dim)' }}>{t.vitorias}V · {t.derrotas}D · {t.gols_marcados} gols</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {artilheiros.length > 0 && (
        <div className="pl-list" style={{ paddingTop: 0 }}>
          <div className="pl-card" style={{ display: 'block' }}>
            <div className="pl-pending-title pl-section-title">Artilheiros</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {artilheiros.slice(0, 10).map((a) => (
                <div key={a.jogadorId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--paper)' }}>{a.nome}</span>
                  <span style={{ color: 'var(--paper-dim)' }}>{a.gols} {a.gols === 1 ? 'gol' : 'gols'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {souCriador && sessao.status === 'ativa' && (
        <div className="pl-list" style={{ paddingTop: 0, paddingBottom: 32 }}>
          <div className="pl-card" style={{ display: 'block' }}>
            <div className="pl-pending-title pl-section-title">Adicionar jogador</div>
            {adicionandoJogador ? (
              <PlayerSearch
                onSelect={(p) => { adicionarJogador(p); setAdicionandoJogador(false); }}
                excludeIds={[...times.flatMap((t) => t.jogadores.map((j) => j.user_id)), ...listaEspera.map((j) => j.user_id)].filter(Boolean)}
              />
            ) : (
              <button type="button" className="pl-share-btn" onClick={() => setAdicionandoJogador(true)}>Chegou mais gente</button>
            )}
          </div>
          <button type="button" className="pl-share-btn pl-btn-danger" style={{ marginTop: 10 }} disabled={busy} onClick={encerrarSessao}>
            Encerrar Desafiado
          </button>
        </div>
      )}

      {modalGol && (
        <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && setModalGol(null)}>
          <div className="pl-modal">
            <h3>Quem marcou pelo {nomeTime(modalGol)}?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {modalGol.jogadores.map((j) => (
                <button
                  key={j.id} type="button" className="pl-btn-secondary" disabled={busy}
                  onClick={() => { marcarGol(modalGol.id, j.id); setModalGol(null); }}
                >
                  {j.nome}
                </button>
              ))}
            </div>
            <div className="pl-modal-actions"><button type="button" className="pl-btn-secondary" onClick={() => setModalGol(null)}>Cancelar</button></div>
          </div>
        </div>
      )}

      {modalDesempate && (
        <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && setModalDesempate(false)}>
          <div className="pl-modal">
            <h3>Empatou!</h3>
            <p>Como vocês querem decidir?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              <button type="button" className="pl-btn-secondary" disabled={busy} onClick={() => encerrarPartida('prorrogacao')}>Prorrogação</button>
              <button type="button" className="pl-btn-secondary" disabled={busy} onClick={() => { setModalDesempate(false); setModalPenaltis(true); }}>Pênaltis</button>
              <TicketButton disabled={busy} onClick={() => encerrarPartida('cara_coroa')}>Cara ou coroa</TicketButton>
            </div>
            <div className="pl-modal-actions"><button type="button" className="pl-btn-secondary" onClick={() => setModalDesempate(false)}>Voltar</button></div>
          </div>
        </div>
      )}

      {modalPenaltis && timeA && timeB && (
        <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && setModalPenaltis(false)}>
          <div className="pl-modal">
            <h3>Quem venceu os pênaltis?</h3>
            <p>Resolve na hora, sem cronômetro — só marca aqui quem ganhou.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" className="pl-btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => encerrarPartida('penaltis', timeA.id)}>{nomeTime(timeA)}</button>
              <button type="button" className="pl-btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => encerrarPartida('penaltis', timeB.id)}>{nomeTime(timeB)}</button>
            </div>
            <div className="pl-modal-actions"><button type="button" className="pl-btn-secondary" onClick={() => setModalPenaltis(false)}>Voltar</button></div>
          </div>
        </div>
      )}

      {coinFlip && (
        <div className="pl-overlay">
          <div className="pl-modal" style={{ textAlign: 'center' }}>
            <h3>{coinFlip.resultado === 'cara' ? 'Cara!' : 'Coroa!'}</h3>
            <p>{nomeTime(times.find((t) => t.id === (coinFlip.resultado === 'cara' ? coinFlip.timeCaraId : coinFlip.timeCoroaId)))} venceu no sorteio.</p>
          </div>
        </div>
      )}
    </div>
  );
}
