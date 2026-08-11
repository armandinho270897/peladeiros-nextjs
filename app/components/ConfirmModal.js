'use client';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import TicketButton from './TicketButton';

export default function ConfirmModal({ game, onCancel, onConfirmed }) {
  const { profile } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/games/${game.id}/confirmar`, { method: 'POST' });
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
