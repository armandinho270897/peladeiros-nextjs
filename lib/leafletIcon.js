import L from 'leaflet';

// A CARTO passou a exigir chave (mesmo no tier gratuito, mesmo na URL
// clássica sem parâmetro nenhum) a partir de meados de 2026 — confirmado
// testando os 3 casos (com chave, com api_key= errado, sem chave nenhuma):
// todos voltam a mesma imagem de watermark "KEY REQUIRED", byte a byte
// idêntica, mesmo com HTTP 200. Trocado pro Esri Dark Gray Canvas
// (server.arcgisonline.com), tile service gratuito e anônimo de verdade,
// sem cadastro nem chave — nota: o esquema de path do Esri é
// {z}/{y}/{x} (y antes de x), diferente do padrão {z}/{x}/{y} do
// XYZ/CARTO/OSM. Único ponto de definição, usado tanto no mapa principal
// quanto no mini-mapa de admin. Cobertura real de tile desse serviço vai só
// até zoom 16 (confirmado: zoom 18 sobre São Paulo volta um placeholder
// "Map data not yet available") — por isso todo TileLayer que usa essa
// constante também passa maxNativeZoom={16}, senão dar zoom além disso
// mostra área em branco em vez de esticar o último tile disponível. Também
// não tem variante retina (@2x) como a CARTO tinha via {r} — tile levemente
// mais "soft" em tela de alta densidade é o trade-off aceito por ser um
// provedor genuinamente gratuito e sem chave.
export const DARK_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

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
