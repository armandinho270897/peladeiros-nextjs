import L from 'leaflet';

// Histórico: CARTO passou a exigir chave (mesmo na URL clássica sem
// parâmetro nenhum) em meados de 2026; trocamos pro Esri Dark Gray Canvas
// anônimo, mas esse é um endpoint legado que a própria Esri já não cobre
// na documentação atual de desenvolvedor (o produto atual deles é todo
// via conta/chave paga) — mesmo padrão estrutural do CARTO, risco latente.
// Trocado de vez pro Jawg Maps (jawg-dark): modelo de conta+chave desde o
// início (sem ilusão de "anônimo pra sempre" pra quebrar de novo), estilo
// escuro desenhado de propósito (mais rico visualmente que o Esri, que é
// deliberadamente neutro/plano), suporte nativo a retina via {r}, cobertura
// até zoom 22 (sem o gap de zoom que o Esri tinha). Chave pública de
// propósito (client-side, é o modelo documentado pela própria Jawg — não é
// segredo como uma service role key). Único ponto de definição, usado
// tanto no mapa principal quanto no mini-mapa de admin.
export const DARK_TILE_URL = `https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=${process.env.NEXT_PUBLIC_JAWG_ACCESS_TOKEN}`;

export const DARK_TILE_ATTRIBUTION = '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank" class="jawg-attrib">&copy; <b>Jawg</b>Maps</a> | <a href="https://www.openstreetmap.org/copyright" title="OpenStreetMap is open data licensed under ODbL" target="_blank" class="osm-attrib">&copy; OpenStreetMap</a>';

// maxZoom do exemplo oficial da Jawg (github.com/jawg/leaflet-examples) —
// sem isso o Leaflet usa o default de 18, que já bastaria pro app hoje,
// mas 22 é o que a Jawg de fato cobre e é o valor usado na doc deles.
export const DARK_TILE_MAX_ZOOM = 22;

// Corrige o caminho dos ícones padrão do Leaflet, que quebra com o bundler do Next.js.
// Os PNGs foram copiados de node_modules/leaflet/dist/images para public/leaflet.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

function coloredPinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="${color}" stroke="#0A0A0A" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="5.5" fill="#0A0A0A"/>
    </svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

// Pin dourado pra arenas cadastradas (locais fixos), verde-neon pra pins de
// pelada com vaga aberta, cinza-concreto pra pelada lotada — mesma cor
// "neutro/encerrado" já usada nos ícones de notificação e no selo de vagas.
export const arenaIcon = coloredPinIcon('#FFC53D');
export const peladaIcon = coloredPinIcon('#A6FF00');
export const peladaLotadaIcon = coloredPinIcon('#6E7178');

// Ponto pulsante pra posição do usuário — visualmente distinto dos pins de
// jogo/arena (círculo sólido com anel de pulso, não o formato de gota).
// Constante de módulo, não função — o conteúdo é sempre o mesmo, então não
// há motivo pra recriar o divIcon a cada render (o pin/marker do Leaflet
// troca de ícone por identidade de objeto; um objeto novo a cada render
// reiniciaria a animação de pulso à toa).
export const userLocationIcon = L.divIcon({
  className: '',
  html: `<div class="pl-map-user-dot"><span class="pl-map-user-dot-pulse"></span></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Pino circular com foto pra arenas aprovadas que têm foto cadastrada —
// mesmo tamanho/âncora do pino padrão, só troca o desenho por um círculo
// com a imagem dentro (estilo CSS em globals.css, classe pl-map-photo-pin).
export function photoIcon(url) {
  return L.divIcon({
    className: '',
    html: `<div class="pl-map-photo-pin"><img src="${url}" alt="" /></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
}

// Pino de pelada gamificado (inspirado em Poképaradas do Pokémon GO):
// miniatura circular com a arte da modalidade (mesma imagem que já ilustra
// o card, via imagemDoTipo) contornada por um anel na cor do status de
// vaga — reaproveita EXATAMENTE as classes que statusVagas() já retorna
// ('aberta'/'ultimas'/'lotada'), não inventa uma classificação nova, e as
// cores de cada uma (neon/gold/concrete) já são usadas com o mesmo
// significado em peladaIcon/peladaLotadaIcon e no badge de vagas do card.
// comGlow (pelada começando em ≤1h, ver comecaEmBreve em gameUtils.js)
// soma um pulso por cima, reaproveitando a MESMA animação/keyframes já
// usada no ponto de localização do usuário (pl-map-user-pulse, logo
// abaixo) — transform+opacity, não box-shadow, de propósito: é a técnica
// mais barata pra rodar em paralelo em várias marcadores ao mesmo tempo
// sem pesar (testado com 10-15 pins simultâneos, ver code review).
export function modalidadePinIcon(imgUrl, statusClasse, comGlow) {
  // As artes em public/imagens_jogos/ são fotos de banner (~1MB cada,
  // pensadas pro card em tela cheia) — sem passar pelo otimizador de
  // imagem do Next (mesma rota /_next/image que o componente <Image>
  // usa por baixo), cada pin no mapa baixaria o arquivo inteiro só pra
  // desenhar um círculo de 36px. w=96 cobre até telas retina (2x de 48px
  // de área visível real do pino).
  const thumbUrl = `/_next/image?url=${encodeURIComponent(imgUrl)}&w=96&q=60`;
  return L.divIcon({
    className: '',
    html: `<div class="pl-map-modalidade-pin ${statusClasse}">
      ${comGlow ? '<span class="pl-map-modalidade-pin-glow"></span>' : ''}
      <div class="pl-map-modalidade-pin-photo"><img src="${thumbUrl}" alt="" /></div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -28],
  });
}

// Pino de arena pro seletor de local de nova pelada (LocationPickerMap) —
// mesma gota dourada de arenaIcon, mas com um badge neon no canto quando a
// arena já tem alguma pelada futura marcada nela ("dá pra ver de longe se
// tem jogo ali ou não", sem precisar tocar no pino). Usado só nesse
// contexto de escolha — o mapa principal (MapViewPins) já tem seu próprio
// jeito de mostrar arena (arenaIcon/photoIcon simples, sem esse badge, já
// que lá quem decide "tem jogo" é o pin da própria pelada, não da arena).
export function arenaContextoPinIcon(temJogo) {
  return L.divIcon({
    className: '',
    html: `<div class="pl-map-arena-ctx-pin">
      <svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="#FFC53D" stroke="#0A0A0A" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="5.5" fill="#0A0A0A"/>
      </svg>
      ${temJogo ? '<span class="pl-map-arena-ctx-badge" title="Tem pelada marcada"></span>' : ''}
    </div>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

// Ícone de bola de futebol, usado como miolo do token quando a arena não
// tem foto cadastrada (mesmo estilo de traço simples dos outros ícones
// deste arquivo, só pra caber num círculo pequeno sem virar ruído visual).
const BOLA_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <circle cx="8" cy="8" r="7" fill="#0A0A0A" stroke="#3A3A3A" stroke-width="1"/>
  <path d="M8 4.2l2.6 1.9-1 3.1H6.4l-1-3.1L8 4.2z" fill="#F3F3EE"/>
</svg>`;

// Token circular pro pin de arena no seletor de local de nova pelada —
// evolução do arenaContextoPinIcon (gota dourada) pro mesmo formato
// gamificado que modalidadePinIcon já usa pras peladas ("estilo
// Poképarada"), com uma diferença nova: sinaliza o status da arena
// (aprovada vs pendente), não só se tem jogo marcado. Pendente só chega
// até aqui quando o pai buscou /api/arenas?todas=1 (usuário autenticado) —
// ver comentário em LocationPickerMap.js.
export function arenaTokenPinIcon(arena, temJogo) {
  const pendente = arena.status === 'pendente';
  const classe = pendente ? 'pendente' : 'aprovada';
  const miolo = arena.foto_url
    ? `<img src="${arena.foto_url}" alt="" />`
    : `<div class="pl-map-arena-token-fallback">${BOLA_SVG}</div>`;
  return L.divIcon({
    className: '',
    html: `<div class="pl-map-arena-token-pin ${classe}">
      ${!pendente ? '<span class="pl-map-arena-token-glow"></span>' : ''}
      <div class="pl-map-arena-token-photo">${miolo}</div>
      ${pendente ? '<span class="pl-map-arena-token-badge-clock" title="Aguardando aprovação">🕒</span>' : ''}
      ${!pendente && temJogo ? '<span class="pl-map-arena-ctx-badge" title="Tem pelada marcada"></span>' : ''}
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -30],
  });
}

export default L;
