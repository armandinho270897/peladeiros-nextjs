import L from 'leaflet';

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

// Pin dourado pra arenas cadastradas (locais fixos), verde-neon pra pins de pelada.
export const arenaIcon = coloredPinIcon('#FFC53D');
export const peladaIcon = coloredPinIcon('#A6FF00');

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
