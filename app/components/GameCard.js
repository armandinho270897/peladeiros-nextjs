'use client';
import { useEffect, useRef, useState } from 'react';
import { fmtDate, aprovadosDe, esperaDe, pendentesDe, ocupandoVagaDe, todayISO } from '@/lib/gameUtils';
import Avatar from './Avatar';
import CaptainIcon from './CaptainIcon';
import TicketButton from './TicketButton';
import Confetti from './Confetti';

function ConfirmadoAvatar({ nome, moral, bench, fotoUrl }) {
  return (
    <div style={{ position: 'relative' }} className={bench ? 'pl-bench-avatar' : ''}>
      <Avatar nome={nome} size={24} fotoUrl={fotoUrl} />
      {moral != null && (
        <div
          style={{
            position: 'absolute', bottom: -4, right: -4,
            background: 'var(--gold)', color: 'var(--ink)',
            fontSize: 9, fontWeight: 700, borderRadius: 'var(--radius-pill)',
            padding: '1px 4px', lineHeight: 1.3,
            border: '1.5px solid var(--card-bg)',
          }}
        >
          ★{moral.toFixed(1)}
        </div>
      )}
    </div>
  );
}

// Status de vagas mais informativo que só o número. "Aberta"/"Lotada" são
// estados neutros (cinza); só "últimas vagas" usa o dourado de urgência.
function statusVagas(restantes, lotado) {
  if (lotado) return { label: '🔴 Lotada', className: 'lotada' };
  if (restantes <= 3) return { label: `🔥 Últimas ${restantes} vaga${restantes === 1 ? '' : 's'}`, className: 'ultimas' };
  return { label: `🟢 Aberta · ${restantes} vagas`, className: 'aberta' };
}

export default function GameCard({ game, currentUserId, onEdit, onConfirm, onShare, onCancelPresenca, onConfirmarVaga, justLotou, distanciaKm }) {
  const g = game;
  const d = fmtDate(g.data);
  const confirmados = aprovadosDe(g);
  const espera = esperaDe(g);
  const pendentes = pendentesDe(g);
  const restantes = Math.max(0, g.vagas_totais - ocupandoVagaDe(g).length);
  const lotado = restantes === 0;
  const status = statusVagas(restantes, lotado);
  const podeEditar = !g.owner_id || g.owner_id === currentUserId;
  const minhaConfirmacao = (g.confirmacoes || []).find((c) => c.user_id === currentUserId);
  const aguardandoAprovacao = minhaConfirmacao?.status === 'pendente';
  const minhaPresencaAprovada = minhaConfirmacao?.status === 'aprovado';
  const minhaVagaAguardandoConfirmacao = minhaConfirmacao?.status === 'aguardando_confirmacao';

  const [pulse, setPulse] = useState(false);
  const prevRestantes = useRef(restantes);
  useEffect(() => {
    if (prevRestantes.current !== restantes) {
      setPulse(true);
      prevRestantes.current = restantes;
      const t1 = setTimeout(() => setPulse(false), 350);
      return () => clearTimeout(t1);
    }
  }, [restantes]);

  const ehHoje = g.data === todayISO();
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!ehHoje) return;
    const id = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(id);
  }, [ehHoje]);

  const contagem = (() => {
    if (!ehHoje) return null;
    const inicio = new Date(`${g.data}T${g.horario}`).getTime();
    const diff = inicio - agora;
    if (diff <= 0) return 'Rolando agora';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `Começa em ${h}h${String(m).padStart(2, '0')}min` : `Começa em ${m}min`;
  })();

  // Contagem regressiva do prazo pra confirmar a vaga — dá pro jogador uma
  // noção real de urgência, em vez de só o botão parado.
  const [agoraPrazo, setAgoraPrazo] = useState(() => Date.now());
  useEffect(() => {
    if (!minhaVagaAguardandoConfirmacao) return;
    const id = setInterval(() => setAgoraPrazo(Date.now()), 30000);
    return () => clearInterval(id);
  }, [minhaVagaAguardandoConfirmacao]);

  const contagemPrazo = (() => {
    if (!minhaVagaAguardandoConfirmacao || !minhaConfirmacao?.prazo_confirmacao) return null;
    const diff = new Date(minhaConfirmacao.prazo_confirmacao).getTime() - agoraPrazo;
    if (diff <= 0) return 'Prazo vencendo...';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `Confirma em até ${h}h${String(m).padStart(2, '0')}min` : `Confirma em até ${m}min`;
  })();

  return (
    <div className="pl-card">
      {justLotou && <Confetti />}
      {lotado && <div className="pl-stamp">Lotado</div>}

      {/* Linha 1 — essencial, alto contraste: local + dia/hora + vagas */}
      <div className="pl-card-line1">
        <div className="pl-date"><div className="dow">{d.dow}</div><div className="dom">{d.dom}</div></div>
        <div className="pl-card-line1-main">
          <h3>{g.local}</h3>
          <span className="pl-card-when">{contagem || g.horario}</span>
        </div>
        <div className="pl-card-line1-side">
          <div className={`pl-status-badge ${status.className} ${pulse ? 'pl-flip-pulse' : ''}`}>{status.label}</div>
          {podeEditar && (
            <button className="pl-edit-link-inline" onClick={() => onEdit(g)}>
              Editar
              {pendentes.length > 0 && <span className="pl-pending-badge">{pendentes.length}</span>}
            </button>
          )}
        </div>
      </div>

      {/* Linha 2 — secundário: tipo de jogo, bairro, distância */}
      <div className="pl-card-line2">
        {g.tipo && <span className="pl-tipo-tag">{g.tipo}</span>}
        <span className="pl-bairro-tag">{g.bairro}</span>
        {distanciaKm != null && (
          <span className="pl-distancia">📍 {distanciaKm.toFixed(1).replace('.', ',')} km</span>
        )}
      </div>

      {/* Linha 3 — status de participação em destaque, ou o botão de ação */}
      <div className="pl-card-line3">
        {aguardandoAprovacao ? (
          <p className="pl-aguardando">Aguardando aprovação do capitão</p>
        ) : minhaVagaAguardandoConfirmacao ? (
          <>
            <p className="pl-aguardando">Aprovado — falta você confirmar</p>
            {contagemPrazo && <p className="pl-prazo-confirmacao">{contagemPrazo}</p>}
            <TicketButton compact onClick={() => onConfirmarVaga(minhaConfirmacao.id)}>
              Confirmar minha vaga
            </TicketButton>
          </>
        ) : minhaPresencaAprovada ? (
          <span className="pl-inside-badge">✓ Você está dentro</span>
        ) : (
          <TicketButton compact onClick={() => onConfirm(g)}>
            {lotado ? 'Entrar no banco' : 'Confirmar'}
          </TicketButton>
        )}
      </div>

      {/* Rodapé discreto — capitão, avaliações, cancelar, compartilhar */}
      <div className="pl-card-footer">
        <div className="pl-card-footer-row">
          <p className="pl-card-capitao"><CaptainIcon /> {g.capitao}</p>
          {minhaPresencaAprovada && (
            <button className="pl-link-danger-small" onClick={() => onCancelPresenca(minhaConfirmacao.id, g)}>
              Cancelar presença
            </button>
          )}
        </div>

        {confirmados.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {confirmados.slice(0, 6).map((c) => (
              <ConfirmadoAvatar key={c.id} nome={c.nome} moral={c.moral} fotoUrl={c.foto_url} />
            ))}
            {confirmados.length > 6 && (
              <div style={{ fontSize: 11, color: 'var(--paper-dim)', alignSelf: 'center' }}>+{confirmados.length - 6}</div>
            )}
          </div>
        )}
        {espera.length > 0 && (
          <div className="pl-bench">
            <span className="pl-bench-label">Banco:</span>
            {espera.slice(0, 6).map((c) => (
              <ConfirmadoAvatar key={c.id} nome={c.nome} moral={c.moral} fotoUrl={c.foto_url} bench />
            ))}
            {espera.length > 6 && <span style={{ fontSize: 11, color: 'var(--concrete)' }}>+{espera.length - 6}</span>}
          </div>
        )}

        <div className="pl-card-share-row">
          <button className="pl-icon-btn" onClick={() => onShare(g)} aria-label="Compartilhar">🔗</button>
        </div>
      </div>
    </div>
  );
}
