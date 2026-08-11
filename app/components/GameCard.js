'use client';
import { useEffect, useRef, useState } from 'react';
import { fmtDate, aprovadosDe, esperaDe, pendentesDe } from '@/lib/gameUtils';
import Avatar from './Avatar';
import CaptainIcon from './CaptainIcon';
import TicketButton from './TicketButton';

function ConfirmadoAvatar({ nome, notaMedia, bench }) {
  return (
    <div style={{ position: 'relative' }} className={bench ? 'pl-bench-avatar' : ''}>
      <Avatar nome={nome} size={26} />
      {notaMedia != null && (
        <div
          style={{
            position: 'absolute', bottom: -4, right: -4,
            background: 'var(--gold)', color: 'var(--ink)',
            fontSize: 9, fontWeight: 700, borderRadius: 8,
            padding: '1px 4px', lineHeight: 1.3,
            border: '1.5px solid var(--card-bg)',
          }}
        >
          ★{notaMedia.toFixed(1)}
        </div>
      )}
    </div>
  );
}

export default function GameCard({ game, currentUserId, onEdit, onConfirm, onShare, onCancelPresenca }) {
  const g = game;
  const d = fmtDate(g.data);
  const confirmados = aprovadosDe(g);
  const espera = esperaDe(g);
  const pendentes = pendentesDe(g);
  const restantes = Math.max(0, g.vagas_totais - confirmados.length);
  const lotado = restantes === 0;
  const podeEditar = !g.owner_id || g.owner_id === currentUserId;
  const minhaConfirmacao = (g.confirmacoes || []).find((c) => c.user_id === currentUserId);
  const aguardandoAprovacao = minhaConfirmacao?.status === 'pendente';
  const minhaPresencaAprovada = minhaConfirmacao?.status === 'aprovado';

  const [pulse, setPulse] = useState(false);
  const prevRestantes = useRef(restantes);
  useEffect(() => {
    if (prevRestantes.current !== restantes) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 350);
      prevRestantes.current = restantes;
      return () => clearTimeout(t);
    }
  }, [restantes]);

  return (
    <div className="pl-card">
      {lotado && <div className="pl-stamp">Lotado</div>}
      {podeEditar && (
        <button className="pl-edit-link" onClick={() => onEdit(g)}>
          Editar
          {pendentes.length > 0 && <span className="pl-pending-badge">{pendentes.length}</span>}
        </button>
      )}
      <div className="pl-date"><div className="dow">{d.dow}</div><div className="dom">{d.dom}</div></div>
      <div className="pl-info">
        <h3>{g.local}</h3>
        <p className="meta">{g.horario}</p>
        <span className="pl-bairro-tag">{g.bairro}</span>
        <p className="meta"><CaptainIcon /> Capitão: <b>{g.capitao}</b></p>
        {confirmados.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {confirmados.slice(0, 6).map((c) => (
              <ConfirmadoAvatar key={c.id} nome={c.nome} notaMedia={c.nota_media} />
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
              <ConfirmadoAvatar key={c.id} nome={c.nome} notaMedia={c.nota_media} bench />
            ))}
            {espera.length > 6 && <span style={{ fontSize: 11, color: 'var(--concrete)' }}>+{espera.length - 6}</span>}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className={`pl-flip ${lotado ? 'lotado' : ''} ${pulse ? 'pl-flip-pulse' : ''}`}>{lotado ? 'X' : restantes}</div>
        <div style={{ fontSize: 10, color: 'var(--paper-dim)' }}>{lotado ? 'lotado' : 'vagas'}</div>
        {aguardandoAprovacao ? (
          <p className="pl-aguardando">Aguardando aprovação do capitão</p>
        ) : minhaPresencaAprovada ? (
          <button className="pl-btn-secondary pl-btn-danger" onClick={() => onCancelPresenca(minhaConfirmacao.id, g)}>
            Cancelar presença
          </button>
        ) : (
          <TicketButton compact onClick={() => onConfirm(g)}>
            {lotado ? 'Entrar no banco' : 'Confirmar'}
          </TicketButton>
        )}
        <button className="pl-share-btn" onClick={() => onShare(g)}>Compartilhar</button>
      </div>
    </div>
  );
}
