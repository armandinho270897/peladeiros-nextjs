'use client';
import { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { arenaIcon, peladaIcon, photoIcon } from '@/lib/leafletIcon';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { fmtDate, aprovadosDe } from '@/lib/gameUtils';
import TicketButton from './TicketButton';
import EmptyFieldIcon from './EmptyFieldIcon';

const DEFAULT_CENTER = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;

const ACESSO_LABEL = { publico: 'Público', privado: 'Privado', nao_confirmado: 'Acesso não confirmado' };

// Cluster com a cor/tipografia do app em vez do amarelo/laranja de fábrica
// do leaflet.markercluster.
function clusterIcon(cluster) {
  return L.divIcon({
    html: `<div class="pl-map-cluster">${cluster.getChildCount()}</div>`,
    className: '',
    iconSize: [38, 38],
  });
}

export default function MapViewPins({ games, arenas = [], onConfirm }) {
  const [selecionado, setSelecionado] = useState(null); // { type: 'arena' | 'pelada', data }
  // Mantém o último conteúdo mostrado durante a animação de fechar (senão o
  // sheet desliza pra baixo já vazio, porque selecionado já virou null).
  const [conteudoSheet, setConteudoSheet] = useState(null);

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

  function selecionar(item) {
    setSelecionado(item);
    setConteudoSheet(item);
  }

  function fecharSheet() {
    setSelecionado(null);
  }

  function confirmarDoSheet() {
    if (conteudoSheet?.type === 'pelada') onConfirm(conteudoSheet.data);
    fecharSheet();
  }

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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MarkerClusterGroup iconCreateFunction={clusterIcon} showCoverageOnHover={false}>
            {arenasComCoordenadas.map((a) => (
              <Marker
                key={`arena-${a.id}`}
                position={[Number(a.latitude), Number(a.longitude)]}
                icon={a.foto_url ? photoIcon(a.foto_url) : arenaIcon}
                eventHandlers={{ click: () => selecionar({ type: 'arena', data: a }) }}
              />
            ))}
            {jogosComCoordenadas.map((g) => (
              <Marker
                key={`pelada-${g.id}`}
                position={[Number(g.latitude), Number(g.longitude)]}
                icon={peladaIcon}
                eventHandlers={{ click: () => selecionar({ type: 'pelada', data: g }) }}
              />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      )}

      <div className={`pl-map-sheet ${selecionado ? 'pl-map-sheet-open' : ''}`}>
        <div className="pl-map-sheet-handle" />
        {conteudoSheet?.type === 'arena' && (() => {
          const a = conteudoSheet.data;
          const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${a.latitude},${a.longitude}`;
          return (
            <>
              <div className="pl-map-sheet-body">
                {a.foto_url ? (
                  <img className="pl-map-sheet-photo" src={a.foto_url} alt={a.nome} />
                ) : (
                  <div className="pl-map-sheet-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📍</div>
                )}
                <div style={{ flex: 1 }}>
                  <h3 className="pl-map-sheet-title">{a.nome}</h3>
                  <p className="pl-map-sheet-meta" style={{ textTransform: 'capitalize' }}>{a.tipo} · {a.bairro}</p>
                  <p className="pl-map-sheet-meta">{a.endereco}</p>
                  {a.acesso && <p className="pl-map-sheet-meta">{ACESSO_LABEL[a.acesso] || a.acesso}</p>}
                </div>
                <button className="pl-map-sheet-close" onClick={fecharSheet} aria-label="Fechar">×</button>
              </div>
              <TicketButton compact style={{ marginTop: 12, width: '100%' }} onClick={() => window.open(gmapsUrl, '_blank')}>
                📍 Como chegar
              </TicketButton>
            </>
          );
        })()}

        {conteudoSheet?.type === 'pelada' && (() => {
          const g = conteudoSheet.data;
          const d = fmtDate(g.data);
          const confirmados = aprovadosDe(g).length;
          const restantes = Math.max(0, g.vagas_totais - confirmados);
          return (
            <>
              <div className="pl-map-sheet-body">
                <div style={{ flex: 1 }}>
                  <h3 className="pl-map-sheet-title">{g.local}</h3>
                  <p className="pl-map-sheet-meta">{d.dow} {d.dom} às {g.horario}</p>
                  <p className="pl-map-sheet-meta">{restantes > 0 ? `${restantes} vaga(s)` : 'Lotado'}</p>
                </div>
                <button className="pl-map-sheet-close" onClick={fecharSheet} aria-label="Fechar">×</button>
              </div>
              <TicketButton compact style={{ marginTop: 12, width: '100%' }} onClick={confirmarDoSheet}>
                {restantes > 0 ? 'Confirmar' : 'Entrar no banco'}
              </TicketButton>
            </>
          );
        })()}
      </div>
    </div>
  );
}
