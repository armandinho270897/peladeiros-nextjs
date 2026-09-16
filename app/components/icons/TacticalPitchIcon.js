// Campo visto de cima, estilo prancheta tática — moldura, linha de meio
// de campo e círculo central. Só isso: sem áreas, sem marcas de pênalti,
// sem gols desenhados — no tamanho de ícone de nav, mais detalhe vira mancha.
export default function TacticalPitchIcon({ active = false, className = '', size = 24 }) {
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
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <line x1="12" y1="5.5" x2="12" y2="18.5" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}
