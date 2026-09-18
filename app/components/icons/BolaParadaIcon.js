// Mesmo estilo giz/grafite do EmptyFieldIcon (rgba(paper, 0.35), sem
// preenchimento) — usado em estados vazios menores, dentro de modais/
// painéis, onde o campo inteiro do EmptyFieldIcon é grande demais.
export default function BolaParadaIcon({ width = 72 }) {
  return (
    <svg width={width} height={(width * 60) / 72} viewBox="0 0 120 100" fill="none" stroke="rgba(243,243,238,0.35)" strokeWidth="1.5" aria-hidden="true">
      <circle cx="60" cy="40" r="24" />
      <path d="M60 24l10 7-4 12H54l-4-12z" strokeLinejoin="round" />
      <path d="M60 24V16M70 31l8-5M66 43l6 7M54 43l-6 7M50 31l-8-5" />
      <line x1="14" y1="80" x2="106" y2="80" strokeDasharray="3 6" />
      <ellipse cx="60" cy="80" rx="26" ry="4" fill="rgba(243,243,238,0.12)" stroke="none" />
    </svg>
  );
}
