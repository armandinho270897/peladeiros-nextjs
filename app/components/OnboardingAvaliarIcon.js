// Sparkle de 4 pontas — reaproveitado 3x ao redor da estrela como
// brilho ambiente (twinkle em loop, não é confete de uma ação só como
// no selo do passo 2; aqui é "reputação brilhando", contínuo).
const SPARKLE = 'M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z';
const TWINKLES = [
  { x: 116, y: 30, scale: 0.85, delay: '0s' },
  { x: 44, y: 42, scale: 0.65, delay: '0.8s' },
  { x: 108, y: 92, scale: 0.7, delay: '1.5s' },
];

export default function OnboardingAvaliarIcon({ width = 160 }) {
  const starPath = 'M80 22l11 22 24 3.5-17.5 17 4 24L80 77l-21.5 11.5 4-24-17.5-17 24-3.5z';
  return (
    <svg width={width} height={(width * 120) / 160} viewBox="0 0 160 120" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="pl-onb-star-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="rgba(255,197,61,0.3)" />
          <stop offset="100%" stopColor="rgba(255,197,61,0)" />
        </radialGradient>
        <radialGradient id="pl-onb-star-body" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#FFE6A0" />
          <stop offset="100%" stopColor="var(--gold)" />
        </radialGradient>
        <filter id="pl-onb-star-shadow" x="-40%" y="-30%" width="180%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>
      <ellipse cx="80" cy="55" rx="52" ry="42" fill="url(#pl-onb-star-glow)" />
      <g filter="url(#pl-onb-star-shadow)">
        <path d={starPath} fill="url(#pl-onb-star-body)" className="pl-onb-fill" />
        <path pathLength="1" d={starPath} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" className="pl-onb-draw" />
      </g>
      {TWINKLES.map((t, i) => (
        // posição/tamanho no <g> (atributo SVG) e animação no <path> (CSS)
        // de propósito — transform via atributo e via CSS no MESMO elemento
        // não compõem, a propriedade CSS simplesmente vence e descarta o
        // atributo, o que jogaria os sparkles todos pra origem (0,0).
        <g key={i} transform={`translate(${t.x} ${t.y}) scale(${t.scale})`}>
          <path d={SPARKLE} fill="var(--paper)" className="pl-onb-twinkle" style={{ animationDelay: t.delay }} />
        </g>
      ))}
      <circle cx="80" cy="105" r="3" fill="rgba(243,243,238,0.3)" className="pl-onb-fill" />
      <circle cx="60" cy="108" r="2" fill="rgba(243,243,238,0.2)" className="pl-onb-fill" />
      <circle cx="100" cy="108" r="2" fill="rgba(243,243,238,0.2)" className="pl-onb-fill" />
    </svg>
  );
}
