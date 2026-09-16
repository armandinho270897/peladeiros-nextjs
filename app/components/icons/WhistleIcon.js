// Apito de juiz — bojo redondo, bocal (tubo) à esquerda e uma fenda de som
// no topo do bojo. Três formas simples, sem argola de cordão, pra não virar
// clipart — mas o bojo circular + bocal é o que faz ler como apito de
// verdade (a primeira versão, em cápsula única, lia como botão/pendrive).
export default function WhistleIcon({ active = false, className = '', size = 24 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-active={active || undefined}
      aria-hidden="true"
    >
      <circle cx="15" cy="12" r="5" />
      <rect x="3.5" y="10" width="7.5" height="4" rx="2" />
      <line x1="13.2" y1="8" x2="16.8" y2="8" />
    </svg>
  );
}
