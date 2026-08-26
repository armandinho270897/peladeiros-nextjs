// Traço passa pelo filtro #pl-rough-filter (definido uma vez em BottomNav.js)
// pra fugir do "line icon" de biblioteca — mesmo filtro usado no ícone da
// bola do botão central, pra manter a família visual coerente.
export default function PeladasBallIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" filter="url(#pl-rough-filter)">
      <circle cx="14" cy="9.6" r="4.3" stroke="currentColor" strokeWidth="2.1" />
      <path d="M14 6.4l1.9 1.35-.7 2.15h-2.4l-.7-2.15z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M3.4 17.2c2.1-.25 3.7-1 5.1-2.05" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      <path d="M3.2 13.4c1.6-.2 2.9-.7 4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
