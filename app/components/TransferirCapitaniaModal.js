'use client';
import { useState } from 'react';
import TicketButton from './TicketButton';
import Avatar from './Avatar';

export default function TransferirCapitaniaModal({ time, membros, onClose, onTransferred }) {
  const [selecionado, setSelecionado] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirmar() {
    if (!selecionado) { setError('Escolhe um jogador pra ser o novo capitão.'); return; }
    if (!confirm(`Tem certeza? ${selecionado.nome} vira o capitão do ${time.nome} e você vira membro comum. Isso não pode ser desfeito.`)) return;

    setLoading(true);
    setError('');
    const res = await fetch(`/api/times/${time.id}/transferir-capitania`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novoCapitaoUserId: selecionado.id }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(json.error || 'Não consegui transferir a capitania.'); return; }
    onTransferred();
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Transferir capitania</h3>
        <p className="pl-hint">Escolhe quem vira o novo capitão do time. Você vira membro comum.</p>
        <div className="pl-list" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {membros.map((p) => (
            <button
              type="button"
              key={p.id}
              className="pl-card"
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: selecionado?.id === p.id ? '2px solid var(--neon)' : undefined }}
              onClick={() => setSelecionado(p)}
            >
              <Avatar nome={p.nome} size={40} fotoUrl={p.foto_url} />
              <div className="pl-info"><h3>{p.nome}</h3></div>
            </button>
          ))}
        </div>
        {error && <p className="pl-error">{error}</p>}
        <div className="pl-modal-actions">
          <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
          <TicketButton type="button" disabled={loading || !selecionado} onClick={handleConfirmar}>
            {loading ? 'Transferindo...' : 'Transferir'}
          </TicketButton>
        </div>
      </div>
    </div>
  );
}
