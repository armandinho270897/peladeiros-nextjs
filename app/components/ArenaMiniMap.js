'use client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { arenaIcon, DARK_TILE_URL } from '@/lib/leafletIcon';

// Mini-mapa somente-leitura pra conferir o pino de uma arena pendente
// antes de aprovar — mesmas tiles escuras do mapa principal.
export default function ArenaMiniMap({ lat, lng }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ height: 140, width: '100%', borderRadius: 'var(--radius-md)' }}
      dragging={false}
      scrollWheelZoom={false}
      zoomControl={false}
      doubleClickZoom={false}
      attributionControl={false}
    >
      <TileLayer url={DARK_TILE_URL} maxNativeZoom={16} />
      <Marker position={[lat, lng]} icon={arenaIcon} />
    </MapContainer>
  );
}
