'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { userLocationIcon, modalidadePinIcon, arenaTokenPinIcon, DARK_TILE_URL, DARK_TILE_ATTRIBUTION, DARK_TILE_MAX_ZOOM } from '@/lib/leafletIcon';
import { ocupandoVagaDe, statusVagas } from '@/lib/gameUtils';
import { imagemDoTipo } from '@/lib/tipoJogoImagem';
import TicketButton from './TicketButton';

const FALLBACK_MODALIDADE_IMG = '/imagens_jogos/campo.jpg';

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

export default function LocationPickerMap({ lat, lng, onPick, onAddressResolved, onArenaPicked }) {
  const [query, setQuery] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const searchDebounce = useRef(null);
  const reverseDebounce = useRef(null);
  // O wizard de nova pelada desmonta esse componente ao trocar de passo
  // (renderização condicional por step) — sem isso, um reverse-geocode
  // ainda em voo (setTimeout de 500ms) sobrevive ao unmount e, ao disparar,
  // chama onAddressResolved do pai (NewGameModal) mesmo com o mapa já fora
  // da tela, sobrescrevendo o nome/bairro certo (ex: de uma arena escolhida)
  // por um endereço genérico. Achado testando o fluxo real de escolher uma
  // arena e avançar os passos em seguida.
  useEffect(() => {
    return () => {
      clearTimeout(searchDebounce.current);
      clearTimeout(reverseDebounce.current);
    };
  }, []);
  // setFlyTarget->FlyTo chama map.setView, que dispara moveend igual a um
  // arraste manual — sem isso, escolher uma arena mostraria o nome certo
  // (ex: "Quadra do CEMA") por 500ms e depois trocaria sozinho pro endereço
  // genérico que o reverse-geocode desse mesmo ponto devolve. É uma
  // CONTAGEM, não um boolean: cancelar uma animação de pan em andamento
  // (ex: tocar em duas arenas rápido, antes da primeira terminar de mover
  // o mapa) dispara um moveend "fantasma" extra pela própria cancelamento
  // do Leaflet (map._stop() → PosAnimation.stop() → fire('moveend')) — um
  // boolean simples seria consumido por esse fantasma e deixaria o moveend
  // de verdade (da seleção mais recente) reativar o reverse-geocode por
  // engano. A contagem garante 1 supressão pra cada seleção pendente,
  // não importa quantos moveends (fantasmas ou reais) isso gere no total.
  const suppressoesPendentes = useRef(0);

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

  // Arenas aprovadas — mostradas como pino tocável ("usar este local"),
  // igual à ideia das Poképaradas: dá pra ver de longe se um lugar já
  // cadastrado tem pelada marcada ou não, e escolher batendo o olho no
  // mapa em vez de só pelo dropdown "vincular arena existente". Só busca e
  // mostra quando o pai passa onArenaPicked — é o sinal de que esse uso do
  // seletor é "escolher local pra uma pelada nova" (NewGameModal). No
  // cadastro de UMA NOVA arena (NewArenaModal) não faz sentido oferecer
  // "usar o local de uma arena já existente": arriscaria a nova arena
  // acabar com a mesma coordenada de outra por engano.
  const [arenas, setArenas] = useState([]);
  useEffect(() => {
    if (!onArenaPicked) return;
    // ?todas=1: também traz arenas pendentes (só quando logado, ver
    // app/api/arenas/route.js) — mostradas em cinza no mapa, pra quem tá
    // criando a pelada ver que aquele local já foi proposto e não duplicar.
    fetch('/api/arenas?todas=1')
      .then((res) => (res.ok ? res.json() : []))
      .then(setArenas)
      .catch(() => {});
  }, []);

  // Sheet de detalhes da arena tocada — substitui o Popup padrão do
  // Leaflet, igual ao padrão já usado no mapa principal (MapViewPins.js).
  const [arenaSelecionada, setArenaSelecionada] = useState(null);

  // Arrastar o mapa dispara handleMoveEnd -> onPick -> re-render deste
  // componente a cada frame; sem memoizar, o ícone de cada pelada existente
  // (aberta/lotada) seria recalculado nesse ritmo à toa, já que a lista em
  // si só muda uma vez (no fetch inicial). Mesma arte+anel gamificados do
  // mapa principal (modalidadePinIcon) — sem o glow de "começa em breve"
  // aqui: esse contexto é só uma referência rápida enquanto se escolhe um
  // local, não a tela de navegar/entrar num jogo, então a animação extra
  // não paga o custo de complexidade a mais (tick periódico, teto etc.).
  const peladasComIcone = useMemo(
    () => peladasExistentes.map((g) => {
      const restantes = Math.max(0, g.vagas_totais - ocupandoVagaDe(g).length);
      const statusClasse = statusVagas(restantes, restantes === 0).className;
      const imgUrl = imagemDoTipo(g.tipo) || FALLBACK_MODALIDADE_IMG;
      return { ...g, icone: modalidadePinIcon(imgUrl, statusClasse, false) };
    }),
    [peladasExistentes]
  );

  // Uma arena "tem jogo" se alguma pelada futura (já carregada acima)
  // referencia ela via arena_id — mesma lista, sem outro fetch.
  const arenasComStatus = useMemo(() => {
    const idsComJogo = new Set(peladasExistentes.map((g) => g.arena_id).filter(Boolean));
    return arenas
      .filter((a) => a.latitude != null && a.longitude != null)
      .map((a) => ({ ...a, temJogo: idsComJogo.has(a.id) }));
  }, [arenas, peladasExistentes]);

  const center = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;
  const zoom = lat != null && lng != null ? PICK_ZOOM : DEFAULT_ZOOM;

  function handleMoveEnd(la, lo) {
    onPick(la, lo);
    if (suppressoesPendentes.current > 0) {
      suppressoesPendentes.current--;
      return;
    }
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
    // Zera qualquer supressão pendente de uma arena escolhida antes — uma
    // busca nova sempre quer o endereço de verdade, não herda a trava.
    suppressoesPendentes.current = 0;
    const la = Number(s.lat), lo = Number(s.lon);
    setFlyTarget({ lat: la, lng: lo });
    setQuery('');
    setSugestoes([]);
    handleMoveEnd(la, lo);
  }

  // Diferente de selecionarSugestao: já sabemos o nome/bairro exatos da
  // arena, então NÃO passa pelo reverse-geocode de handleMoveEnd (que
  // rodaria em cima e podia sobrescrever o nome certo por um endereço
  // genérico quando o debounce disparasse). Cancela qualquer reverse-geocode
  // pendente de um arraste anterior por segurança.
  function selecionarArena(arena) {
    clearTimeout(reverseDebounce.current);
    suppressoesPendentes.current++;
    const la = Number(arena.latitude), lo = Number(arena.longitude);
    setFlyTarget({ lat: la, lng: lo });
    onPick(la, lo);
    onAddressResolved?.({ local: arena.nome, bairro: arena.bairro });
    onArenaPicked?.(arena);
    setArenaSelecionada(null);
  }

  // Arena pendente: usa nome/bairro/coordenada como texto livre, igual a
  // tocar em qualquer ponto do mapa — a pelada não fica vinculada (arena_id)
  // a um local que ainda pode ser rejeitado na fila de aprovação. Chama
  // onArenaPicked(null) pra limpar um vínculo que possa ter ficado de uma
  // arena APROVADA escolhida antes nessa mesma sessão do formulário — sem
  // isso o arenaId ficava "grudado" na arena errada mesmo com local/bairro
  // já mostrando a pendente (achado testando esse fluxo ao vivo).
  function usarLocalPendente(arena) {
    clearTimeout(reverseDebounce.current);
    suppressoesPendentes.current++;
    const la = Number(arena.latitude), lo = Number(arena.longitude);
    setFlyTarget({ lat: la, lng: lo });
    onPick(la, lo);
    onAddressResolved?.({ local: arena.nome, bairro: arena.bairro });
    onArenaPicked?.(null);
    setArenaSelecionada(null);
  }

  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Mesma lógica de selecionarSugestao: geolocalização real do
        // usuário sempre quer o endereço de verdade, não herda supressão
        // de uma arena escolhida um instante antes.
        suppressoesPendentes.current = 0;
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
      <div className="pl-location-map-wrap">
        <MapContainer center={center} zoom={zoom} zoomControl={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution={DARK_TILE_ATTRIBUTION} url={DARK_TILE_URL} maxZoom={DARK_TILE_MAX_ZOOM} />
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
          {arenasComStatus.map((a) => (
            <Marker
              key={`arena-${a.id}`}
              position={[Number(a.latitude), Number(a.longitude)]}
              icon={arenaTokenPinIcon(a, a.temJogo)}
              eventHandlers={{ click: () => setArenaSelecionada(a) }}
            />
          ))}
        </MapContainer>
        <div className="pl-location-center-pin" aria-hidden="true">
          <svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="var(--neon)" stroke="#0A0A0A" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="5.5" fill="#0A0A0A" />
          </svg>
        </div>

        <div className="pl-location-map-controls">
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
          <button type="button" className="pl-location-map-controls-geo-btn" onClick={usarLocalizacaoAtual}>
            📍 Usar minha localização atual
          </button>
          {buscando && <p style={{ fontSize: 11, color: 'var(--paper-dim)', margin: 0 }}>Buscando...</p>}
        </div>

        <div className={`pl-map-sheet ${arenaSelecionada ? 'pl-map-sheet-open' : ''}`}>
          {arenaSelecionada && (() => {
            const a = arenaSelecionada;
            const pendente = a.status === 'pendente';
            return (
              <>
                <div className="pl-map-sheet-handle" />
                <div className="pl-map-sheet-body">
                  {a.foto_url ? (
                    <img className="pl-map-sheet-photo" src={a.foto_url} alt={a.nome} />
                  ) : (
                    <div className="pl-map-sheet-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>⚽</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <span className={`pl-map-sheet-tag ${pendente ? 'pendente' : 'oficial'}`}>{pendente ? 'Pendente' : 'Oficial'}</span>
                    <h3 className="pl-map-sheet-title">{a.nome}</h3>
                    <p className="pl-map-sheet-meta">{a.bairro}</p>
                    {!pendente && (
                      <p className="pl-map-sheet-meta">{a.temJogo ? '🟢 Tem pelada marcada aqui' : 'Nenhuma pelada marcada ainda'}</p>
                    )}
                  </div>
                  <button className="pl-map-sheet-close" onClick={() => setArenaSelecionada(null)} aria-label="Fechar">×</button>
                </div>
                <TicketButton compact style={{ marginTop: 12, width: '100%' }} onClick={() => (pendente ? usarLocalPendente(a) : selecionarArena(a))}>
                  {pendente ? 'Usar esta localização' : 'Selecionar este local'}
                </TicketButton>
              </>
            );
          })()}
        </div>
      </div>
      <p style={{ fontSize: 11, color: 'var(--paper-dim)', margin: '6px 0 0' }}>Arraste o mapa pra ajustar o pino no centro. As fotos são peladas marcadas por perto; os tokens dourados são arenas — toque num pra ver detalhes e usar o local.</p>
    </div>
  );
}
