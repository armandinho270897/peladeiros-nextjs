'use client';
import 'leaflet/dist/leaflet.css';
import { arenaIcon, peladaIcon } from '@/lib/leafletIcon';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { fmtDate, aprovadosDe } from '@/lib/gameUtils';
import TicketButton from './TicketButton';
import EmptyFieldIcon from './EmptyFieldIcon';

const DEFAULT_CENTER = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;

const ACESSO_LABEL = { publico: 'Público', privado: 'Privado', nao_confirmado: 'Acesso não confirmado' };

export default function MapViewPins({ games, arenas = [], onConfirm }) {
  const jogosComCoordenadas = games.filter((g) => g.latitude != null && g.longitude != null);
  const arenasComCoordenadas = arenas.filter((a) => a.latitude != null && a.longitude != null);
  const todosOsPins = [...jogosComCoordenadas, ...arenasComCoordenadas];

  const center =
    todosOsPins.length > 0
      ? [
          todosOsPins.reduce((s, p) => s + Number(p.latitude), 0) / todosOsPins.length,
          todosOsPins.reduce((s, p) => s + Number(p.longitude), 0) / todosOsPins.length,
        ]
      : DEFAULT_CENTER;
  const zoom = todosOsPins.length > 0 ? 12 : DEFAULT_ZOOM;

  return (
    <div style={{ maxWidth: 640, margin: '14px auto 0', padding: '0 16px' }}>
      {todosOsPins.length === 0 ? (
        <div className="pl-empty" style={{ padding: '40px 20px' }}>
          <EmptyFieldIcon width={110} />
          <p>Nenhuma pelada ou arena com localização marcada no mapa ainda.</p>
        </div>
      ) : (
        <MapContainer center={center} zoom={zoom} style={{ height: 420, width: '100%', borderRadius: 6 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {arenasComCoordenadas.map((a) => (
            <Marker key={`arena-${a.id}`} position={[Number(a.latitude), Number(a.longitude)]} icon={arenaIcon}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <b>{a.nome}</b>
                  <div style={{ textTransform: 'capitalize' }}>{a.tipo}</div>
                  <div>{a.endereco}</div>
                  <div>{a.bairro}</div>
                  {a.acesso && <div>{ACESSO_LABEL[a.acesso] || a.acesso}</div>}
                </div>
              </Popup>
            </Marker>
          ))}
          {jogosComCoordenadas.map((g) => {
            const d = fmtDate(g.data);
            const confirmados = aprovadosDe(g).length;
            const restantes = Math.max(0, g.vagas_totais - confirmados);
            return (
              <Marker key={`pelada-${g.id}`} position={[Number(g.latitude), Number(g.longitude)]} icon={peladaIcon}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <b>{g.local}</b>
                    <div>{d.dow} {d.dom} às {g.horario}</div>
                    <div>{restantes > 0 ? `${restantes} vaga(s)` : 'Lotado'}</div>
                    <TicketButton compact style={{ marginTop: 6 }} onClick={() => onConfirm(g)}>
                      {restantes > 0 ? 'Confirmar' : 'Entrar no banco'}
                    </TicketButton>
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
