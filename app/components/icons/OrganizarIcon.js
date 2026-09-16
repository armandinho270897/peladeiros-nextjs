// Prancheta do organizador — clipboard com um campo tático em miniatura
// dentro (mesma linguagem do TacticalPitchIcon: moldura + linha central +
// círculo), em vez do check genérico que tinha antes. Reautorada no mesmo
// padrão dos ícones da nav: um traço só (1.8), sem fill sólido no clipe.
export default function OrganizarIcon({ active = false, className = '', size = 24 }) {
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
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <rect x="9.3" y="2.8" width="5.4" height="2.6" rx="1" />
      <rect x="8" y="10" width="8" height="6" rx="0.6" />
      <line x1="12" y1="10" x2="12" y2="16" />
      <circle cx="12" cy="13" r="1.3" />
    </svg>
  );
}
