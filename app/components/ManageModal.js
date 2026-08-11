'use client';
import { useState } from 'react';
import { getCaptainCode, saveCaptainCode } from '@/lib/captainCodes';
import TicketButton from './TicketButton';

export default function ManageModal({ game, onClose, onSaved }) {
  const semOwner = !game.owner_id;
  const savedCode = semOwner ? getCaptainCode(game.id) : null;
  const [unlocked, setUnlocked] = useState(!semOwner || !!savedCode);
  const [codigo, setCodigo] = useState(savedCode || '');
  const [error, setError] = useState('');

  function tryUnlock(e) {
    e.preventDefault();
    setUnlocked(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const f = e.target;
    const body = {
      codigo,
      local: f.local.value.trim(),
      bairro: f.bairro.value.trim(),
      data: f.data.value,
      horario: f.horario.value,
      vagasTotais: parseInt(f.vagas.value, 10),
    };
    const res = await fetch(`/api/games/${game.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    if (!res.ok) { const r = await res.json(); setError(r.error); return; }
    if (semOwner) saveCaptainCode(game.id, codigo);
    onSaved();
  }

  async function handleCancelGame() {
    if (!confirm('Tem certeza? Isso não pode ser desfeito.')) return;
    const res = await fetch(`/api/games/${game.id}`, { method: 'DELETE', body: JSON.stringify({ codigo }) });
    if (!res.ok) { const r = await res.json(); setError(r.error); return; }
    onSaved();
  }

  if (!unlocked) {
    return (
      <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="pl-modal">
          <h3>Área do capitão</h3>
          <form key="unlock-form" onSubmit={tryUnlock}>
            <div className="pl-field"><label>Código</label><input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={4} /></div>
            {error && <p className="pl-error">{error}</p>}
            <div className="pl-modal-actions">
              <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
              <TicketButton type="submit">Entrar</TicketButton>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Editar pelada</h3>
        <form key="edit-form" onSubmit={handleSave}>
          <div className="pl-field"><label>Local</label><input name="local" defaultValue={game.local} /></div>
          <div className="pl-field"><label>Bairro</label><input name="bairro" defaultValue={game.bairro} /></div>
          <div className="pl-field"><label>Data</label><input type="date" name="data" defaultValue={game.data} /></div>
          <div className="pl-field"><label>Horário</label><input type="time" name="horario" defaultValue={game.horario} /></div>
          <div className="pl-field"><label>Vagas totais</label><input type="number" name="vagas" defaultValue={game.vagas_totais} /></div>
          {error && <p className="pl-error">{error}</p>}
          <div className="pl-modal-actions">
            <button type="button" className="pl-btn-secondary pl-btn-danger" onClick={handleCancelGame}>Cancelar pelada</button>
            <TicketButton type="submit">Salvar</TicketButton>
          </div>
        </form>
      </div>
    </div>
  );
}
