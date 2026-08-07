import L from 'leaflet';

// Corrige o caminho dos ícones padrão do Leaflet, que quebra com o bundler do Next.js.
// Os PNGs foram copiados de node_modules/leaflet/dist/images para public/leaflet.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

export default L;
