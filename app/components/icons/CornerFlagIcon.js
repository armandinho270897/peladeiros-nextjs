// Bandeirinha de escanteio — mastro, bandeira triangular presa perto do
// topo e uma linha de base marcando o chão. Substitui o apito (WhistleIcon):
// mesmo depois de três reconstruções (bojo redondo, corpo alongado, câmara
// estilo Fox 40), continuava difícil de ler em 26-28px — a bandeirinha é um
// símbolo bem mais direto e exclusivo de futebol, sem essa ambiguidade.
export default function CornerFlagIcon({ active = false, className = '', size = 24 }) {
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
      <path d="M6.5 20V4" />
      <path d="M6.5 4.5 16 7.8 6.5 10.5Z" />
      <path d="M4 20h5" />
    </svg>
  );
}
