'use client';
import { useState } from 'react';
import { aprovadosDe } from '@/lib/gameUtils';
import { getCaptainCode } from '@/lib/captainCodes';
import Avatar from './Avatar';
import TicketButton from './TicketButton';

export default function EncerrarPartidaModal({ game, onClose, onEncerrada }) {
  const aprovados = aprovadosDe(game);
  const [presentes, setPresentes] = useState(() => {
    const initial = {};
    aprovados.forEach((c) => { initial[c.id] = true; });
    return initial;
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toggle(id) {
    setPresentes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleConfirm() {
    setLoading(true);
    const ausentesIds = aprovados.filter((c) => !presentes[c.id]).map((c) => c.id);
    const res = await fetch(`/api/games/${game.id}/encerrar`, {
      method: 'POST',
      body: JSON.stringify({ codigo: getCaptainCode(game.id) || '', ausentesIds }),
    });
    const result = await res.json();
    setLoading(false);
    if (!res.ok) { setError(result.error); return; }
    onEncerrada();
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Encerrar partida</h3>
        <p className="pl-hint">Marca quem compareceu. Todo mundo começa presente — desmarca só quem faltou. Isso libera as avaliações dessa pelada.</p>
        {aprovados.length === 0 ? (
          <p className="pl-hint">Ninguém confirmado nessa pelada.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '14px 0' }}>
            {aprovados.map((c) => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!presentes[c.id]} onChange={() => toggle(c.id)} style={{ width: 20, height: 20, accentColor: 'var(--neon)' }} />
                <Avatar nome={c.nome} size={28} fotoUrl={c.foto_url} />
                <span style={{ fontSize: 14 }}>{c.nome}</span>
              </label>
            ))}
          </div>
        )}
        {error && <p className="pl-error">{error}</p>}
        <div className="pl-modal-actions">
          <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
          <TicketButton onClick={handleConfirm} disabled={loading}>{loading ? 'Encerrando...' : 'Confirmar encerramento'}</TicketButton>
        </div>
      </div>
    </div>
  );
}
