'use client';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import TicketButton from './TicketButton';

export default function ConfirmModal({ game, onCancel, onConfirmed }) {
  const { profile } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');

  async function handleConfirm(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/games/${game.id}/confirmar`, { method: 'POST', body: JSON.stringify({ mensagem }) });
    const result = await res.json();
    setLoading(false);
    if (!res.ok) { setError(result.error); return; }
    setError('');
    onConfirmed(result);
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pl-modal">
        <h3>Confirmar presença</h3>
        <form onSubmit={handleConfirm}>
          <p>Confirmar como <b>{profile?.nome}</b>?</p>
          <div className="pl-field">
            <label>Mensagem pro capitão (opcional)</label>
            <textarea
              maxLength={200}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Ex: chego uns 10 min atrasado"
            />
          </div>
          {error && <p className="pl-error">{error}</p>}
          <div className="pl-modal-actions">
            <button type="button" className="pl-btn-secondary" onClick={onCancel}>Cancelar</button>
            <TicketButton type="submit" disabled={loading}>{loading ? 'Confirmando...' : 'Confirmar'}</TicketButton>
          </div>
        </form>
      </div>
    </div>
  );
}
