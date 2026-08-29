'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { peladaIcon, peladaLotadaIcon, userLocationIcon, CARTO_DARK_TILE_URL } from '@/lib/leafletIcon';
import { ocupandoVagaDe } from '@/lib/gameUtils';

const DEFAULT_CENTER = [-14.235, -51.9253]; // centro do Brasil
const DEFAULT_ZOOM = 4;
const PICK_ZOOM = 16;
const GEO_TIMEOUT_MS = 10000;

// Nominatim (OpenStreetMap) — geocoding público e gratuito, mesma filosofia
// de "sem API paga" já usada no filtro de raio (Haversine).
async function buscarEnderecos(q) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&countrycodes=br&accept-language=pt-BR&limit=5`);
  return res.json();
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR`);
  return res.json();
}

function MoveTracker({ onMoveEnd }) {
  const map = useMapEvents({
    moveend() {
      const c = map.getCenter();
      onMoveEnd(c.lat, c.lng);
    },
  });
  return null;
}

// Move o mapa imperativamente — MapContainer só aplica center/zoom no mount,
// então busca por endereço e geolocalização precisam disso pra recentralizar.
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], PICK_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return null;
}

export default function LocationPickerMap({ lat, lng, onPick, onAddressResolved }) {
  const [query, setQuery] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const searchDebounce = useRef(null);
  const reverseDebounce = useRef(null);

  // Ponto pulsante "aqui é onde você está de verdade" — puramente
  // informativo, não mexe no pino central (esse é a localização da pelada
  // sendo criada, coisa diferente). undefined = ainda buscando, null =
  // negado/indisponível, {lat,lng} = obtido; nunca bloqueia a primeira
  // renderização do mapa, só aparece se/quando resolver.
  const [minhaLocalizacao, setMinhaLocalizacao] = useState(undefined);
  useEffect(() => {
    if (!navigator.geolocation) { setMinhaLocalizacao(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setMinhaLocalizacao({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMinhaLocalizacao(null),
      { timeout: GEO_TIMEOUT_MS }
    );
  }, []);

  // Peladas futuras com coordenada, só pra dar contexto visual ("já tem
  // jogo por aqui?") enquanto escolhe onde marcar a nova — pins não
  // clicáveis, não é uma tela de navegação. Endpoint enxuto (sem as notas
  // de avaliação que /api/games carrega), pra não repetir aquele custo
  // só pra mostrar uns pontos no mapa.
  const [peladasExistentes, setPeladasExistentes] = useState([]);
  useEffect(() => {
    fetch('/api/games/mapa')
      .then((res) => (res.ok ? res.json() : []))
      .then(setPeladasExistentes)
      .catch(() => {});
  }, []);

  // Arrastar o mapa dispara handleMoveEnd -> onPick -> re-render deste
  // componente a cada frame; sem memoizar, o ícone de cada pelada existente
  // (aberta/lotada) seria recalculado nesse ritmo à toa, já que a lista em
  // si só muda uma vez (no fetch inicial).
  const peladasComIcone = useMemo(
    () => peladasExistentes.map((g) => ({
      ...g,
      icone: Math.max(0, g.vagas_totais - ocupandoVagaDe(g).length) > 0 ? peladaIcon : peladaLotadaIcon,
    })),
    [peladasExistentes]
  );

  const center = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;
  const zoom = lat != null && lng != null ? PICK_ZOOM : DEFAULT_ZOOM;

  function handleMoveEnd(la, lo) {
    onPick(la, lo);
    clearTimeout(reverseDebounce.current);
    reverseDebounce.current = setTimeout(async () => {
      try {
        const data = await reverseGeocode(la, lo);
        const a = data.address || {};
        const local = [a.road, a.house_number].filter(Boolean).join(', ') || (data.display_name || '').split(',')[0] || '';
        const bairro = a.suburb || a.neighbourhood || a.city_district || a.village || a.town || '';
        if (local || bairro) onAddressResolved?.({ local, bairro });
      } catch {
        // geocoding falhou — usuário preenche o endereço na mão, não trava o fluxo
      }
    }, 500);
  }

  function handleQueryChange(e) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(searchDebounce.current);
    if (q.trim().length < 3) { setSugestoes([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setBuscando(true);
      try {
        setSugestoes(await buscarEnderecos(q));
      } catch {
        setSugestoes([]);
      }
      setBuscando(false);
    }, 400);
  }

  function selecionarSugestao(s) {
    const la = Number(s.lat), lo = Number(s.lon);
    setFlyTarget({ lat: la, lng: lo });
    setQuery('');
    setSugestoes([]);
    handleMoveEnd(la, lo);
  }

  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude, lo = pos.coords.longitude;
        setFlyTarget({ lat: la, lng: lo });
        handleMoveEnd(la, lo);
      },
      () => {},
      { timeout: GEO_TIMEOUT_MS }
    );
  }

  return (
    <div className="pl-location-picker">
      <div className="pl-player-search">
        <input type="text" value={query} onChange={handleQueryChange} placeholder="Buscar endereço..." autoComplete="off" />
        {sugestoes.length > 0 && (
          <div className="pl-player-search-results">
            {sugestoes.map((s) => (
              <button type="button" key={s.place_id} className="pl-player-search-item" onClick={() => selecionarSugestao(s)}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="pl-share-btn" style={{ marginTop: 6 }} onClick={usarLocalizacaoAtual}>
        📍 Usar minha localização atual
      </button>
      {buscando && <p style={{ fontSize: 11, color: 'var(--paper-dim)', margin: '4px 0 0' }}>Buscando...</p>}

      <div className="pl-location-map-wrap">
        <MapContainer center={center} zoom={zoom} style={{ height: 220, width: '100%', borderRadius: 'var(--radius-lg)' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={CARTO_DARK_TILE_URL}
          />
          <MoveTracker onMoveEnd={handleMoveEnd} />
          <FlyTo target={flyTarget} />
          {minhaLocalizacao && (
            <Marker position={[minhaLocalizacao.lat, minhaLocalizacao.lng]} icon={userLocationIcon} interactive={false} />
          )}
          {peladasComIcone.map((g) => (
            <Marker
              key={g.id}
              position={[Number(g.latitude), Number(g.longitude)]}
              icon={g.icone}
              interactive={false}
            />
          ))}
        </MapContainer>
        <div className="pl-location-center-pin" aria-hidden="true">
          <svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="var(--neon)" stroke="#0A0A0A" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="5.5" fill="#0A0A0A" />
          </svg>
        </div>
      </div>
      <p style={{ fontSize: 11, color: 'var(--paper-dim)', margin: '6px 0 0' }}>Arraste o mapa pra ajustar o pino no centro. Os outros pontos são peladas que já existem por perto.</p>
    </div>
  );
}
