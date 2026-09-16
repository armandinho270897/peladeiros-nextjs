// Camisa de futebol — silhueta única (gola V, mangas curtas, corpo),
// um só path fechado. Sem número, sem faixas, sem escudo: perfil já
// reconhece a forma de camisa sem precisar de nenhum detalhe interno.
export default function JerseyIcon({ active = false, className = '', size = 24 }) {
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
      <path d="M9 5 5 7 3.5 10.2 6.3 9.1V19h11.4V9.1l2.8 1.1L19 7 15 5l-3 2.3Z" />
    </svg>
  );
}
