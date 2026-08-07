'use client';
import 'leaflet/dist/leaflet.css';
import '@/lib/leafletIcon';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { fmtDate, confirmadosDe } from '@/lib/gameUtils';

const DEFAULT_CENTER = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;

export default function MapViewPins({ games, onConfirm }) {
  const comCoordenadas = games.filter((g) => g.latitude != null && g.longitude != null);

  const center =
    comCoordenadas.length > 0
      ? [
          comCoordenadas.reduce((s, g) => s + Number(g.latitude), 0) / comCoordenadas.length,
          comCoordenadas.reduce((s, g) => s + Number(g.longitude), 0) / comCoordenadas.length,
        ]
      : DEFAULT_CENTER;
  const zoom = comCoordenadas.length > 0 ? 12 : DEFAULT_ZOOM;

  return (
    <div style={{ maxWidth: 640, margin: '14px auto 0', padding: '0 16px' }}>
      {comCoordenadas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--paper-dim)' }}>
          Nenhuma pelada com localização marcada no mapa ainda.
        </div>
      ) : (
        <MapContainer center={center} zoom={zoom} style={{ height: 420, width: '100%', borderRadius: 6 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {comCoordenadas.map((g) => {
            const d = fmtDate(g.data);
            const confirmados = confirmadosDe(g).length;
            const restantes = Math.max(0, g.vagas_totais - confirmados);
            return (
              <Marker key={g.id} position={[Number(g.latitude), Number(g.longitude)]}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <b>{g.local}</b>
                    <div>{d.dow} {d.dom} às {g.horario}</div>
                    <div>{restantes > 0 ? `${restantes} vaga(s)` : 'Lotado'}</div>
                    <button className="pl-confirm-btn" style={{ marginTop: 6 }} onClick={() => onConfirm(g)}>
                      {restantes > 0 ? 'Confirmar' : 'Entrar na fila'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}
    </div>
  );
}
