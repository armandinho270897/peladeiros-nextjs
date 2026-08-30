'use client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { arenaIcon, DARK_TILE_URL, DARK_TILE_ATTRIBUTION, DARK_TILE_MAX_ZOOM } from '@/lib/leafletIcon';

// Mini-mapa somente-leitura pra conferir o pino de uma arena pendente
// antes de aprovar — mesmas tiles escuras do mapa principal. Atribuição
// obrigatória mesmo num mapa pequeno/admin: os termos da Jawg (seção 5.6)
// não abrem exceção por tamanho ou por ser tela autenticada — "no
// exceptions can be made" — omitir arriscava o token (compartilhado com
// os outros 2 mapas) ser suspenso por violação de contrato.
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
    >
      <TileLayer attribution={DARK_TILE_ATTRIBUTION} url={DARK_TILE_URL} maxZoom={DARK_TILE_MAX_ZOOM} />
      <Marker position={[lat, lng]} icon={arenaIcon} />
    </MapContainer>
  );
}
