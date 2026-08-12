'use client';
import { useState } from 'react';
import { emCimaDaHora as calcEmCimaDaHora } from '@/lib/gameUtils';
import TicketButton from './TicketButton';

export default function CancelPresencaModal({ confirmacaoId, game, onClose, onCancelled }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const emCimaDaHora = calcEmCimaDaHora(game);

  async function handleConfirm() {
    setLoading(true);
    const res = await fetch(`/api/confirmacoes/${confirmacaoId}`, { method: 'DELETE', body: JSON.stringify({}) });
    setLoading(false);
    if (!res.ok) { const r = await res.json(); setError(r.error); return; }
    onCancelled();
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Cancelar presença</h3>
        <p>Tem certeza? Sua vaga vai ser liberada pro próximo do banco de reservas.</p>
        {emCimaDaHora && (
          <p className="pl-error">Tá em cima da hora — o time pode ficar sem reposição a tempo.</p>
        )}
        {error && <p className="pl-error">{error}</p>}
        <div className="pl-modal-actions">
          <button type="button" className="pl-btn-secondary" onClick={onClose}>Voltar</button>
          <button type="button" className="pl-btn-secondary pl-btn-danger" disabled={loading} onClick={handleConfirm}>
            {loading ? 'Cancelando...' : 'Cancelar presença'}
          </button>
        </div>
      </div>
    </div>
  );
}
