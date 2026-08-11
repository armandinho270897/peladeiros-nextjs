'use client';
import { fmtDate, confirmadosDe, esperaDe } from '@/lib/gameUtils';

export default function GameCard({ game, currentUserId, onEdit, onConfirm, onShare }) {
  const g = game;
  const d = fmtDate(g.data);
  const confirmados = confirmadosDe(g);
  const espera = esperaDe(g);
  const restantes = Math.max(0, g.vagas_totais - confirmados.length);
  const lotado = restantes === 0;
  const podeEditar = !g.owner_id || g.owner_id === currentUserId;

  return (
    <div className="pl-card">
      {podeEditar && (
        <button
          style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: 'var(--paper-dim)', fontSize: 11, cursor: 'pointer' }}
          onClick={() => onEdit(g)}
        >
          Editar
        </button>
      )}
      <div className="pl-date"><div className="dow">{d.dow}</div><div className="dom">{d.dom}</div></div>
      <div className="pl-info">
        <h3>{g.local}</h3>
        <p className="meta">{g.horario}</p>
        <span className="pl-bairro-tag">{g.bairro}</span>
        <p className="meta">👑 Capitão: <b>{g.capitao}</b></p>
        {espera.length > 0 && <p style={{ color: 'var(--gold)', fontSize: 11 }}>{espera.length} na fila de espera</p>}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className={`pl-flip ${lotado ? 'lotado' : ''}`}>{lotado ? 'X' : restantes}</div>
        <div style={{ fontSize: 10, color: 'var(--paper-dim)' }}>{lotado ? 'lotado' : 'vagas'}</div>
        <button className="pl-confirm-btn" onClick={() => onConfirm(g)}>
          {lotado ? 'Entrar na fila' : 'Confirmar'}
        </button>
        <button className="pl-share-btn" onClick={() => onShare(g)}>Compartilhar</button>
      </div>
    </div>
  );
}
