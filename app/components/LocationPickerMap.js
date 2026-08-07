'use client';
import 'leaflet/dist/leaflet.css';
import '@/lib/leafletIcon';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

const DEFAULT_CENTER = [-14.235, -51.9253]; // centro do Brasil
const DEFAULT_ZOOM = 4;
const PICK_ZOOM = 15;

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPickerMap({ lat, lng, onPick }) {
  const center = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;
  const zoom = lat != null && lng != null ? PICK_ZOOM : DEFAULT_ZOOM;

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: 220, width: '100%', borderRadius: 6 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {lat != null && lng != null && <Marker position={[lat, lng]} />}
    </MapContainer>
  );
}
