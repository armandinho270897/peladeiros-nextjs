// Cartão de jogo (silhueta de cartão de árbitro, retrato) com um "+"
// grande ocupando o centro — a moldura é só o contexto ("isto é uma
// pelada"), o sinal de mais é que precisa ler primeiro como "criar".
export default function GameCardIcon({ active = false, className = '', size = 24 }) {
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
      <rect x="6" y="3.5" width="12" height="17" rx="2" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}
