'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { arenaIcon, photoIcon, userLocationIcon, modalidadePinIcon, DARK_TILE_URL, DARK_TILE_ATTRIBUTION, DARK_TILE_MAX_ZOOM } from '@/lib/leafletIcon';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { fmtDate, ocupandoVagaDe, googleMapsDirectionsUrl, statusVagas, comecaEmBreve, inicioDoJogo } from '@/lib/gameUtils';
import { imagemDoTipo } from '@/lib/tipoJogoImagem';
import TicketButton from './TicketButton';
import EmptyFieldIcon from './EmptyFieldIcon';

const DEFAULT_CENTER = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;
const ZOOM_COM_LOCALIZACAO = 14;
const GEO_TIMEOUT_MS = 10000;
const ROTA_TIMEOUT_MS = 8000;
// Endpoint explícito (mesmo valor que o leaflet-routing-machine já usaria
// por padrão) — nomeado aqui de propósito: é o servidor de DEMONSTRAÇÃO do
// OSRM, sem SLA, e o dia que precisar trocar por uma instância paga/própria
// é só mudar essa constante, sem precisar caçar onde o router tá configurado.
const OSRM_DEMO_SERVICE_URL = 'https://router.project-osrm.org/route/v1';

const ACESSO_LABEL = { publico: 'Público', privado: 'Privado', nao_confirmado: 'Acesso não confirmado' };

// Mesmo fallback que TipoJogoIcon usa pra tipo desconhecido/vazio ("Outro"
// cai no ícone genérico de campo) — aqui é a versão foto, pro pin do mapa.
const FALLBACK_MODALIDADE_IMG = '/imagens_jogos/campo.jpg';

// Teto de pins pulsando "começa em breve" ao mesmo tempo — sem isso, num
// horário de pico numa cidade grande, dezenas de peladas podem começar na
// mesma hora e todas ganhariam glow simultâneo (testado só até 15 nesta
// leva). Prioriza quem começa primeiro; o resto mantém o anel de status
// normal, só sem o pulso. Lotada nunca pulsa — glow verde-neon numa pelada
// lotada mandaria o sinal errado (verde já significa "vaga aberta" no
// resto do app).
const MAX_PINS_COM_GLOW = 8;
// Recalcula "começa em breve" periodicamente — sem isso, quem deixa o mapa
// aberto vê o glow ligado pra sempre (nunca desliga quando o jogo começa
// de verdade, já que o memo abaixo só reagia a mudança na lista de jogos).
const RECALCULO_GLOW_MS = 60 * 1000;

// Mediana em vez de média pra centralizar o mapa: uma única coordenada
// mal cravada (ex: geolocalização falhou e devolveu um ponto absurdo tipo
// Atlântico Sul) não consegue puxar o centro pra longe de onde os pins de
// verdade estão — a média simples deixava exatamente isso acontecer (bug
// real encontrado em produção: um jogo com coordenada quebrada jogava o
// mapa inteiro pra um lugar vazio, sem nenhum pin visível).
function mediana(valores) {
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 === 0 ? (ordenado[meio - 1] + ordenado[meio]) / 2 : ordenado[meio];
}

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

  // undefined = ainda buscando; null = negado/indisponível/sem suporte;
  // {lat,lng} = obtido. Sempre resolve em até GEO_TIMEOUT_MS. Diferente da
  // primeira versão: NÃO bloqueia a primeira renderização do mapa — o mapa
  // já aparece com o centro de fallback (média dos pins) e só recentraliza
  // depois, se/quando a localização chegar (ver efeito abaixo).
  const [localizacao, setLocalizacao] = useState(undefined);

  const mapRef = useRef(null);
  const [rotaStatus, setRotaStatus] = useState('idle'); // idle | carregando | ativa
  const routingControlRef = useRef(null);
  const rotaGenRef = useRef(0);

  // Zoom nativo só atrapalha em touch (pinça já faz o trabalho); em desktop
  // (sem hover/touch primário) é a única forma óbvia de dar zoom sem saber
  // do scroll-wheel, então mantém visível — mesma convenção de
  // "(hover: hover)" já usada em outros pontos do app pra distinguir mouse
  // de touch.
  const [zoomControl] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches);

  // Recomputa quem "começa em breve" a cada minuto — sem isso, um jogo que
  // já rolou continuaria com o glow ligado indefinidamente enquanto a lista
  // de peladas (games) não mudar de identidade (não há refetch automático
  // aqui, só em ações pontuais). Não precisa de mais precisão que isso.
  const [agoraTick, setAgoraTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgoraTick(Date.now()), RECALCULO_GLOW_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setLocalizacao(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocalizacao({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocalizacao(null),
      { timeout: GEO_TIMEOUT_MS }
    );
  }, []);

  // Recentraliza o mapa já montado assim que a localização chegar (em vez
  // de esperar ela pra montar o mapa) — mapa e pins aparecem na hora, com o
  // centro de fallback, e só dão um passo extra pra posição do usuário
  // quando/se ela resolver.
  useEffect(() => {
    if (localizacao && mapRef.current) {
      mapRef.current.setView([localizacao.lat, localizacao.lng], ZOOM_COM_LOCALIZACAO);
    }
  }, [localizacao]);

  // Invalida qualquer callback de rota pendente (import ainda resolvendo,
  // ou routesfound/routingerror/timeout chegando depois) se o componente
  // desmontar — sem isso, uma resposta tardia podia chamar removeControl
  // num mapa que o React/Leaflet já destruiu (troca de aba lista/mapa).
  useEffect(() => () => { rotaGenRef.current += 1; }, []);

  // .filter() cria um array novo a cada render — memoiza a partir das props
  // (games/arenas), que só trocam de identidade quando o conteúdo muda de
  // verdade (filtradas em app/peladas/page.js já vem de um useMemo próprio),
  // senão o useMemo de restantesPorJogo abaixo nunca teria uma dependência
  // estável e recalcularia sempre, sem ganhar nada.
  const jogosComCoordenadas = useMemo(() => games.filter((g) => g.latitude != null && g.longitude != null), [games]);
  const arenasComCoordenadas = useMemo(() => arenas.filter((a) => a.latitude != null && a.longitude != null), [arenas]);
  const todosOsPins = useMemo(() => [...jogosComCoordenadas, ...arenasComCoordenadas], [jogosComCoordenadas, arenasComCoordenadas]);

  // Vagas restantes por pelada, calculado uma vez só (não a cada render) e
  // reaproveitado tanto na cor do pin quanto no texto do sheet — mesma
  // definição de "lotado" que GameCard.js usa (ocupandoVagaDe: aprovado +
  // aguardando_confirmacao), pra não divergir do resto do app.
  const restantesPorJogo = useMemo(() => {
    const mapa = {};
    for (const g of jogosComCoordenadas) mapa[g.id] = Math.max(0, g.vagas_totais - ocupandoVagaDe(g).length);
    return mapa;
  }, [jogosComCoordenadas]);

  // Ícone gamificado por pelada (arte da modalidade + anel de status +
  // glow de "começa em breve") — memoizado junto com restantesPorJogo, pelo
  // mesmo motivo: o Marker do Leaflet troca de ícone por identidade de
  // objeto, então recriar um divIcon novo a cada render (ex: ao abrir o
  // sheet) reiniciaria a animação de pulso à toa em todo pin na tela.
  // agoraTick força recomputar a cada minuto (ver efeito acima) — sem isso
  // o glow nunca desligaria sozinho quando o horário do jogo passasse.
  const iconPorJogo = useMemo(() => {
    // Teto de pins com glow simultâneo (MAX_PINS_COM_GLOW) — prioriza quem
    // começa primeiro. Sem isso, um horário de pico numa cidade grande
    // poderia pulsar dezenas de pins ao mesmo tempo, muito além do que foi
    // testado.
    const comecandoEmBreveIds = new Set(
      jogosComCoordenadas
        .filter((g) => comecaEmBreve(g))
        .sort((a, b) => inicioDoJogo(a) - inicioDoJogo(b))
        .slice(0, MAX_PINS_COM_GLOW)
        .map((g) => g.id)
    );

    const mapa = {};
    for (const g of jogosComCoordenadas) {
      const restantes = Math.max(0, g.vagas_totais - ocupandoVagaDe(g).length);
      const statusClasse = statusVagas(restantes, restantes === 0).className;
      const imgUrl = imagemDoTipo(g.tipo) || FALLBACK_MODALIDADE_IMG;
      // Lotada nunca pulsa: glow verde-neon numa pelada sem vaga mandaria o
      // sinal errado (verde já significa "vaga aberta" no resto do app).
      const comGlow = statusClasse !== 'lotada' && comecandoEmBreveIds.has(g.id);
      mapa[g.id] = modalidadePinIcon(imgUrl, statusClasse, comGlow);
    }
    return mapa;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- agoraTick não é lido no corpo, só força o recálculo periódico do glow
  }, [jogosComCoordenadas, agoraTick]);

  const center =
    todosOsPins.length > 0
      ? [
          mediana(todosOsPins.map((p) => Number(p.latitude))),
          mediana(todosOsPins.map((p) => Number(p.longitude))),
        ]
      : DEFAULT_CENTER;
  const zoom = todosOsPins.length > 0 ? 12 : DEFAULT_ZOOM;

  function removerRota() {
    // Invalida qualquer callback pendente de uma chamada anterior de
    // mostrarRotaNoMapa (import ainda resolvendo, ou routesfound/
    // routingerror/timeout chegando depois que o usuário já trocou de pin
    // ou fechou o sheet) — sem isso, uma resposta tardia podia reativar o
    // controle de rota fora de contexto.
    rotaGenRef.current += 1;
    if (routingControlRef.current && mapRef.current) {
      mapRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
    setRotaStatus('idle');
  }

  function selecionar(item) {
    removerRota();
    setSelecionado(item);
    setConteudoSheet(item);
  }

  function fecharSheet() {
    removerRota();
    setSelecionado(null);
  }

  function confirmarDoSheet() {
    if (conteudoSheet?.type === 'pelada') onConfirm(conteudoSheet.data);
    fecharSheet();
  }

  // leaflet-routing-machine usa por padrão o servidor de demonstração do
  // OSRM (router.project-osrm.org), sem SLA — pode cair ou limitar sem
  // aviso. Timeout manual + captura de erro garantem que uma falha aqui só
  // tira a linha do mapa, nunca trava o popup ou o resto da experiência
  // ("Iniciar GPS" continua funcionando de qualquer jeito, é independente
  // desse serviço).
  async function mostrarRotaNoMapa(destino) {
    if (!mapRef.current || !localizacao) return;
    const minhaGeracao = ++rotaGenRef.current;
    setRotaStatus('carregando');
    try {
      await import('leaflet-routing-machine');
      // O usuário pode ter fechado o sheet, trocado de pin, ou saído da
      // aba de mapa enquanto o módulo carregava — se a geração mudou, essa
      // tentativa já não vale.
      if (minhaGeracao !== rotaGenRef.current) return;

      const control = L.Routing.control({
        waypoints: [L.latLng(localizacao.lat, localizacao.lng), L.latLng(destino.lat, destino.lng)],
        router: L.Routing.osrmv1({ serviceUrl: OSRM_DEMO_SERVICE_URL }),
        addWaypoints: false,
        draggableWaypoints: false,
        show: false,
        createMarker: () => null,
      });

      let resolvido = false;
      const timeoutId = setTimeout(() => {
        if (resolvido || minhaGeracao !== rotaGenRef.current) return;
        resolvido = true;
        removerRota();
      }, ROTA_TIMEOUT_MS);

      control.on('routesfound', () => {
        if (resolvido || minhaGeracao !== rotaGenRef.current) return;
        resolvido = true;
        clearTimeout(timeoutId);
        setRotaStatus('ativa');
      });
      control.on('routingerror', () => {
        if (resolvido || minhaGeracao !== rotaGenRef.current) return;
        resolvido = true;
        clearTimeout(timeoutId);
        removerRota();
      });

      control.addTo(mapRef.current);
      routingControlRef.current = control;
    } catch {
      // Falha ao carregar o módulo (rede, etc) — some com a tentativa sem
      // avisar, "Iniciar GPS" segue disponível.
      if (minhaGeracao === rotaGenRef.current) setRotaStatus('idle');
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '14px auto 0', padding: '0 16px' }}>
      {todosOsPins.length === 0 ? (
        <div className="pl-empty" style={{ padding: '40px 20px' }}>
          <EmptyFieldIcon width={110} />
          <p>Nada no mapa ainda 🗺️ Assim que tiver pelada ou arena marcada, aparece aqui.</p>
        </div>
      ) : (
        <MapContainer ref={mapRef} center={center} zoom={zoom} zoomControl={zoomControl} style={{ height: 420, width: '100%', borderRadius: 'var(--radius-lg)' }}>
          <TileLayer attribution={DARK_TILE_ATTRIBUTION} url={DARK_TILE_URL} maxZoom={DARK_TILE_MAX_ZOOM} />
          {localizacao && (
            <Marker position={[localizacao.lat, localizacao.lng]} icon={userLocationIcon} interactive={false} />
          )}
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
                icon={iconPorJogo[g.id]}
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
          const gmapsUrl = googleMapsDirectionsUrl(a.latitude, a.longitude);
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
          const restantes = restantesPorJogo[g.id] ?? 0;
          const gmapsUrl = googleMapsDirectionsUrl(g.latitude, g.longitude);
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
              <div className="pl-map-sheet-actions">
                <TicketButton compact style={{ flex: 1 }} onClick={() => window.open(gmapsUrl, '_blank')}>
                  Iniciar GPS
                </TicketButton>
                {localizacao && rotaStatus !== 'ativa' && (
                  <button
                    type="button"
                    className="pl-map-sheet-rota-btn"
                    disabled={rotaStatus === 'carregando'}
                    onClick={() => mostrarRotaNoMapa({ lat: Number(g.latitude), lng: Number(g.longitude) })}
                  >
                    {rotaStatus === 'carregando' ? 'Traçando rota...' : 'Ver rota no mapa'}
                  </button>
                )}
              </div>
              <TicketButton compact style={{ marginTop: 8, width: '100%' }} onClick={confirmarDoSheet}>
                {restantes > 0 ? 'Confirmar' : 'Entrar no banco'}
              </TicketButton>
            </>
          );
        })()}
      </div>
    </div>
  );
}
