import L from 'leaflet';

// A CARTO passou a exigir chave (mesmo no tier gratuito) a partir de
// meados de 2026 — sem a chave, o tile vem com a marca d'água "KEY
// REQUIRED" por cima. Chave pública de propósito (a própria CARTO recomenda
// usar client-side, é limitada por cota de uso — 5M requisições/mês no
// tier gratuito —, não é segredo como uma service role key). Único ponto
// de definição, usado tanto no mapa principal quanto no mini-mapa de admin.
export const CARTO_DARK_TILE_URL = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`;

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

export default L;
