'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });

export default function NewGameModal({ onCancel, onCreated }) {
  const [error, setError] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });

  async function handleCreate(e) {
    e.preventDefault();
    const f = e.target;
    const body = {
      local: f.local.value.trim(),
      bairro: f.bairro.value.trim(),
      data: f.data.value,
      horario: f.horario.value,
      vagasTotais: parseInt(f.vagas.value, 10),
      capitao: f.capitao.value.trim(),
      codigo: f.codigo.value.trim(),
      latitude: coords.lat,
      longitude: coords.lng,
    };
    const res = await fetch('/api/games', { method: 'POST', body: JSON.stringify(body) });
    const result = await res.json();
    if (!res.ok) { setError(result.error); return; }
    setError('');
    onCreated(result, body.codigo);
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pl-modal">
        <h3>Nova pelada</h3>
        <form onSubmit={handleCreate}>
          <div className="pl-field"><label>Local</label><input name="local" placeholder="Ex: Quadra do Zé" /></div>
          <div className="pl-field"><label>Bairro</label><input name="bairro" placeholder="Ex: Centro" /></div>
          <div className="pl-field"><label>Data</label><input type="date" name="data" /></div>
          <div className="pl-field"><label>Horário</label><input type="time" name="horario" /></div>
          <div className="pl-field"><label>Vagas totais</label><input type="number" name="vagas" min="1" max="30" /></div>
          <div className="pl-field"><label>Seu nome (capitão)</label><input name="capitao" /></div>
          <div className="pl-field"><label>Código (4 números)</label><input name="codigo" maxLength={4} /></div>
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
            <button type="submit" className="pl-btn-primary">Criar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
