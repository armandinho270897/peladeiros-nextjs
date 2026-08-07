'use client';
import { useState } from 'react';

export default function ConfirmModal({ game, perfil, onCancel, onConfirmed }) {
  const [error, setError] = useState('');

  async function handleConfirm(e) {
    e.preventDefault();
    const f = e.target;
    const nome = f.nome.value.trim();
    const whatsapp = f.whatsapp.value.trim();
    if (!nome || !whatsapp) { setError('Nome e WhatsApp são obrigatórios.'); return; }
    const res = await fetch(`/api/games/${game.id}/confirmar`, { method: 'POST', body: JSON.stringify({ nome, whatsapp }) });
    if (!res.ok) { const r = await res.json(); setError(r.error); return; }
    setError('');
    onConfirmed({ nome, whatsapp });
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pl-modal">
        <h3>Confirmar presença</h3>
        <form onSubmit={handleConfirm}>
          <div className="pl-field"><label>Seu nome</label><input name="nome" defaultValue={perfil?.nome || ''} /></div>
          <div className="pl-field"><label>WhatsApp</label><input name="whatsapp" defaultValue={perfil?.whatsapp || ''} /></div>
          {error && <p className="pl-error">{error}</p>}
          <div className="pl-modal-actions">
            <button type="button" className="pl-btn-secondary" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="pl-btn-primary">Confirmar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
