'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useArenas } from '@/lib/useArenas';
import { useAuth } from './AuthProvider';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });

export default function NewGameModal({ onCancel, onCreated }) {
  const { profile } = useAuth();
  const { arenas } = useArenas();
  const [error, setError] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [arenaId, setArenaId] = useState('');
  const [local, setLocal] = useState('');
  const [bairro, setBairro] = useState('');

  function handleArenaChange(id) {
    setArenaId(id);
    if (!id) return;
    const arena = arenas.find((a) => a.id === id);
    if (!arena) return;
    setLocal(arena.nome);
    setBairro(arena.bairro);
    setCoords({ lat: arena.latitude != null ? Number(arena.latitude) : null, lng: arena.longitude != null ? Number(arena.longitude) : null });
  }

  async function handleCreate(e) {
    e.preventDefault();
    const f = e.target;
    const body = {
      local: local.trim(),
      bairro: bairro.trim(),
      data: f.data.value,
      horario: f.horario.value,
      vagasTotais: parseInt(f.vagas.value, 10),
      latitude: coords.lat,
      longitude: coords.lng,
      arenaId: arenaId || null,
    };
    const res = await fetch('/api/games', { method: 'POST', body: JSON.stringify(body) });
    const result = await res.json();
    if (!res.ok) { setError(result.error); return; }
    setError('');
    onCreated(result);
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pl-modal">
        <h3>Nova pelada</h3>
        <form onSubmit={handleCreate}>
          {arenas.length > 0 && (
            <div className="pl-field">
              <label>Vincular a uma arena existente (opcional)</label>
              <select className="pl-select" style={{ width: '100%' }} value={arenaId} onChange={(e) => handleArenaChange(e.target.value)}>
                <option value="">Nenhuma — local livre</option>
                {arenas.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.bairro})</option>)}
              </select>
            </div>
          )}
          <div className="pl-field"><label>Local</label><input name="local" placeholder="Ex: Quadra do Zé" value={local} onChange={(e) => setLocal(e.target.value)} /></div>
          <div className="pl-field"><label>Bairro</label><input name="bairro" placeholder="Ex: Centro" value={bairro} onChange={(e) => setBairro(e.target.value)} /></div>
          <div className="pl-field"><label>Data</label><input type="date" name="data" /></div>
          <div className="pl-field"><label>Horário</label><input type="time" name="horario" /></div>
          <div className="pl-field"><label>Vagas totais</label><input type="number" name="vagas" min="1" max="30" /></div>
          <div className="pl-field">
            <label>Capitão</label>
            <p style={{ margin: 0, fontSize: 14 }}>{profile?.nome} <span style={{ color: 'var(--paper-dim)', fontSize: 12 }}>(você, logado)</span></p>
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
            <button type="submit" className="pl-btn-primary">Criar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
