'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from './AuthProvider';
import TicketButton from './TicketButton';
import { ADMIN_USER_ID } from '@/lib/adminConfig';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });

const TIPOS = ['quadra escolar', 'arena', 'quadra pública', 'rua', 'campo', 'estádio'];

export default function NewArenaModal({ onCancel, onCreated }) {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function handleCreate(e) {
    e.preventDefault();
    // O mapa era opcional — dava pra enviar sem nunca ter tocado nele, e a
    // arena entrava na fila com coordenada nula (ou, pior, com o centro do
    // mapa por engano: um moveend de assentamento inicial do Leaflet, sem
    // nenhum toque do usuário, também conta como "escolha" pro onPick).
    // Achado em produção: duas arenas reais entraram assim no mesmo dia
    // ("Quadra prime" nula, outra perto do centro do Brasil) — nenhuma das
    // duas aparecia no mapa. Arena existe pra ser marcada no mapa; sem
    // coordenada de verdade ela não cumpre esse papel.
    if (coords.lat == null || coords.lng == null) {
      setError('Marca o local no mapa antes de cadastrar — busca o endereço, usa sua localização ou arrasta até o pino certo.');
      return;
    }
    setLoading(true);
    setError('');
    const f = e.target;
    const supabase = createClient();

    let fotoUrl = null;
    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('arena-fotos').upload(path, fotoFile);
      if (uploadError) { setError('Não consegui enviar a foto. Tenta de novo.'); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from('arena-fotos').getPublicUrl(path);
      fotoUrl = urlData.publicUrl;
    }

    const body = {
      nome: f.nome.value.trim(),
      endereco: f.endereco.value.trim(),
      bairro: f.bairro.value.trim(),
      tipo: f.tipo.value,
      latitude: coords.lat,
      longitude: coords.lng,
      fotoUrl,
    };
    const res = await fetch('/api/arenas', { method: 'POST', body: JSON.stringify(body) });
    const result = await res.json();
    setLoading(false);
    if (!res.ok) { setError(result.error); return; }
    setError('');
    onCreated(result);
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pl-modal">
        <h3>Cadastrar arena</h3>
        <p style={{ fontSize: 12, color: 'var(--paper-dim)', marginTop: 0 }}>
          {user?.id === ADMIN_USER_ID
            ? 'Já entra aprovada e aparece direto no mapa.'
            : 'Sua arena entra numa fila de aprovação antes de aparecer no mapa pra todo mundo.'}
        </p>
        <form onSubmit={handleCreate}>
          <div className="pl-field">
            <label>Foto (opcional)</label>
            {fotoPreview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={fotoPreview} alt="" style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                <label htmlFor="foto-arena-input" className="pl-share-btn" style={{ cursor: 'pointer' }}>Trocar foto</label>
              </div>
            ) : (
              <label htmlFor="foto-arena-input" className="pl-share-btn" style={{ cursor: 'pointer', display: 'inline-block' }}>Adicionar foto</label>
            )}
            <input id="foto-arena-input" type="file" accept="image/*" onChange={handleFotoChange} style={{ display: 'none' }} />
          </div>
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
            <label>Local no mapa — busque o endereço, use sua localização ou arraste até marcar</label>
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
            <TicketButton type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Cadastrar'}</TicketButton>
          </div>
        </form>
      </div>
    </div>
  );
}
