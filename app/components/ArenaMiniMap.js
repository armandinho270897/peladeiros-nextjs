'use client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { arenaIcon } from '@/lib/leafletIcon';

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
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <Marker position={[lat, lng]} icon={arenaIcon} />
    </MapContainer>
  );
}
