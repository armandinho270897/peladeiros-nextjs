// Apito de juiz (tipo "pea whistle", o clássico usado em campo) — corpo
// alongado (nunca redondo: apito de verdade é um cilindro comprido, não
// uma bola — a v3 com bojo circular lia como chocalho), linha separando
// bocal do corpo, fenda de som encaixada na borda de cima e a argolinha
// de cordão na ponta — é ESSE detalhe que assina "apito" sem ambiguidade
// (sem ele, corpo + linha + furo lê como controle/pendrive, como a v1).
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
      <rect x="4" y="9.3" width="13" height="5.4" rx="2.7" />
      <line x1="8.5" y1="9.3" x2="8.5" y2="14.7" />
      <path d="M12.5 9.3v1.4" />
      <circle cx="18.8" cy="12" r="1.5" />
    </svg>
  );
}
