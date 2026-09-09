'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import TicketButton from './TicketButton';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });

function toISODate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// Desafio nasce completo (data/horário/local já propostos), não é um
// wizard — uma ação só, mesmos campos de local do passo 1 de
// NewGameModal.js (LocationPickerMap reaproveitado).
export default function DesafiarTimeModal({ time, onClose, onDesafiado }) {
  const [meusTimes, setMeusTimes] = useState([]);
  const [timeDesafianteId, setTimeDesafianteId] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [arenaId, setArenaId] = useState('');
  const [local, setLocal] = useState('');
  const [bairro, setBairro] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/times?papel=capitao')
      .then((r) => r.json())
      .then((times) => {
        const outros = (Array.isArray(times) ? times : []).filter((t) => t.id !== time.id);
        setMeusTimes(outros);
        if (outros.length === 1) setTimeDesafianteId(outros[0].id);
      })
      .catch(() => {});
  }, [time.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!timeDesafianteId) { setError('Escolhe com qual time seu você vai desafiar.'); return; }
    if (!local.trim() || !bairro.trim()) { setError('Preenche o local e o bairro.'); return; }
    if (coords.lat == null || coords.lng == null) { setError('Marca o local no mapa (ou vincula uma arena) antes de continuar.'); return; }
    if (!data || !horario) { setError('Escolhe a data e o horário.'); return; }

    setError('');
    setLoading(true);
    const res = await fetch(`/api/times/${time.id}/desafiar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeDesafianteId,
        local: local.trim(),
        bairro: bairro.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        arenaId: arenaId || null,
        data,
        horario,
        mensagem: mensagem.trim() || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(json.error || 'Não consegui enviar o desafio. Tenta de novo.'); return; }
    onDesafiado(json);
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Desafiar {time.nome}</h3>
        <form onSubmit={handleSubmit}>
          {meusTimes.length > 1 && (
            <div className="pl-field">
              <label>Desafiar com qual time seu</label>
              <select className="pl-select" style={{ width: '100%' }} value={timeDesafianteId} onChange={(e) => setTimeDesafianteId(e.target.value)}>
                <option value="">Selecione</option>
                {meusTimes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          )}
          {meusTimes.length === 0 && (
            <p className="pl-hint">Você precisa ser capitão de outro time pra desafiar {time.nome}.</p>
          )}

          <div className="pl-field"><label>Local</label><input placeholder="Ex: Quadra do Zé" value={local} onChange={(e) => setLocal(e.target.value)} /></div>
          <div className="pl-field"><label>Bairro</label><input placeholder="Ex: Centro" value={bairro} onChange={(e) => setBairro(e.target.value)} /></div>
          <div className="pl-field">
            <label>Local no mapa — busque o endereço, use sua localização ou arraste até marcar</label>
            <LocationPickerMap
              lat={coords.lat}
              lng={coords.lng}
              onPick={(lat, lng) => setCoords({ lat, lng })}
              onAddressResolved={({ local: l, bairro: b }) => {
                if (l) setLocal(l);
                if (b) setBairro(b);
              }}
              onArenaPicked={(arena) => setArenaId(arena ? arena.id : '')}
            />
            {coords.lat != null && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--paper-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                <button type="button" className="pl-share-btn" onClick={() => setCoords({ lat: null, lng: null })}>Limpar</button>
              </div>
            )}
          </div>

          <div className="pl-field">
            <label>Data</label>
            <div className="pl-date-shortcuts">
              <button type="button" onClick={() => setData(toISODate(new Date()))}>Hoje</button>
              <button type="button" onClick={() => setData(toISODate(addDays(new Date(), 1)))}>Amanhã</button>
            </div>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ marginTop: 8 }} />
          </div>
          <div className="pl-field"><label>Horário</label><input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} /></div>
          <div className="pl-field"><label>Mensagem (opcional)</label><textarea rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Ex: bora ver quem manda no bairro?" /></div>

          {error && <p className="pl-error">{error}</p>}
          <div className="pl-modal-actions">
            <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
            <TicketButton type="submit" disabled={loading || meusTimes.length === 0}>{loading ? 'Enviando...' : 'Desafiar'}</TicketButton>
          </div>
        </form>
      </div>
    </div>
  );
}
