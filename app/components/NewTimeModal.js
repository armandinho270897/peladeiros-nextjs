'use client';
import { useState } from 'react';
import TicketButton from './TicketButton';
import Avatar from './Avatar';
import { MODALIDADES } from '@/lib/gameUtils';

export default function NewTimeModal({ onClose, onCreated }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [escudoFile, setEscudoFile] = useState(null);
  const [escudoPreview, setEscudoPreview] = useState(null);

  function handleEscudoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEscudoFile(file);
    setEscudoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const f = e.target;
    const nome = f.nome.value.trim();
    if (!nome) { setError('Dá um nome pro time.'); return; }

    setLoading(true);
    const form = new FormData();
    form.set('nome', nome);
    form.set('bairro', f.bairro.value.trim());
    form.set('modalidade', f.modalidade.value);
    if (escudoFile) form.set('escudo', escudoFile);

    const res = await fetch('/api/times', { method: 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(json.error || 'Não consegui criar o time. Tenta de novo.'); return; }
    onCreated(json);
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Criar time</h3>
        <form onSubmit={handleSubmit}>
          <div className="pl-field" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar nome="" size={64} fotoUrl={escudoPreview} />
            <div>
              <label htmlFor="escudo-input" className="pl-share-btn" style={{ cursor: 'pointer' }}>
                {escudoPreview ? 'Trocar escudo' : 'Adicionar escudo (opcional)'}
              </label>
              <input id="escudo-input" type="file" accept="image/*" onChange={handleEscudoChange} style={{ display: 'none' }} />
            </div>
          </div>
          <div className="pl-field"><label>Nome do time</label><input name="nome" required /></div>
          <div className="pl-field"><label>Bairro (opcional)</label><input name="bairro" /></div>
          <div className="pl-field">
            <label>Modalidade principal (opcional)</label>
            <select className="pl-select" name="modalidade" style={{ width: '100%' }}>
              <option value="">Não informar</option>
              {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {error && <p className="pl-error">{error}</p>}
          <div className="pl-modal-actions">
            <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
            <TicketButton type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar time'}</TicketButton>
          </div>
        </form>
      </div>
    </div>
  );
}
