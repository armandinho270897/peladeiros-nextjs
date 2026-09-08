'use client';

// Prévia de camisa — SVG inline tingido via fill/stroke, sem asset novo.
// Cor primária preenche o corpo, secundária dá o detalhe da gola/mangas.
export default function UniformPreview({ corPrimaria, corSecundaria, size = 48 }) {
  const primaria = corPrimaria || '#2A2A28';
  const secundaria = corSecundaria || '#6E7178';

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2 L8.5 4.6 L4 7.5 L6 11.5 L8 10.2 V22 H16 V10.2 L18 11.5 L20 7.5 L15.5 4.6 Z"
        fill={primaria}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <path d="M8.5 4.6 Q12 7.2 15.5 4.6" stroke={secundaria} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <rect x="8" y="10.2" width="8" height="2.4" fill={secundaria} opacity="0.9" />
    </svg>
  );
}
