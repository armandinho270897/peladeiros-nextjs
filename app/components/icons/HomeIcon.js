// Casa minimalista — telhado + parede + bola na soleira, no lugar da
// porta. É o que amarra esse ícone à identidade de futebol do resto do
// conjunto (camisa, apito, campo, cartão) sem perder a leitura de "casa".
// Sem chaminé, sem janela: qualquer detalhe extra vira ruído no tamanho
// que essa aba renderiza (26-28px).
export default function HomeIcon({ active = false, className = '', size = 24 }) {
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
      <path d="M4 12 12 5l8 7" />
      <path d="M6.5 10.5V19a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-8.5" />
      <circle cx="12" cy="16" r="2.1" />
      <path d="M10.6 14.9 13.4 17.1" />
    </svg>
  );
}
