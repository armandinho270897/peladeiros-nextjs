'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import TicketButton from './TicketButton';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });

const TIPOS = ['quadra escolar', 'arena', 'quadra pública', 'rua'];

export default function NewArenaModal({ onCancel, onCreated }) {
  const [error, setError] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });

  async function handleCreate(e) {
    e.preventDefault();
    const f = e.target;
    const body = {
      nome: f.nome.value.trim(),
      endereco: f.endereco.value.trim(),
      bairro: f.bairro.value.trim(),
      tipo: f.tipo.value,
      latitude: coords.lat,
      longitude: coords.lng,
    };
    const res = await fetch('/api/arenas', { method: 'POST', body: JSON.stringify(body) });
    const result = await res.json();
    if (!res.ok) { setError(result.error); return; }
    setError('');
    onCreated(result);
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pl-modal">
        <h3>Cadastrar arena</h3>
        <form onSubmit={handleCreate}>
          <div className="pl-field"><label>Nome</label><input name="nome" placeholder="Ex: Quadra do Zé" /></div>
          <div className="pl-field"><label>Endereço</label><input name="endereco" placeholder="Ex: Rua Tal, 123" /></div>
          <div className="pl-field"><label>Bairro</label><input name="bairro" placeholder="Ex: Centro" /></div>
          <div className="pl-field">
            <label>Tipo</label>
            <select name="tipo" defaultValue={TIPOS[0]} className="pl-select" style={{ width: '100%' }}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="pl-field">
            <label>Local no mapa (opcional) — toque no mapa para marcar</label>
            <LocationPickerMap lat={coords.lat} lng={coords.lng} onPick={(lat, lng) => setCoords({ lat, lng })} />
            {coords.lat != null && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--paper-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                <button type="button" className="pl-share-btn" onClick={() => setCoords({ lat: null, lng: null })}>Limpar</button>
              </div>
            )}
          </div>
          {error && <p className="pl-error">{error}</p>}
          <div className="pl-modal-actions">
            <button type="button" className="pl-btn-secondary" onClick={onCancel}>Cancelar</button>
            <TicketButton type="submit">Cadastrar</TicketButton>
          </div>
        </form>
      </div>
    </div>
  );
}
