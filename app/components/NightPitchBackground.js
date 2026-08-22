// Cenário das telas de autenticação: quadra à noite. Grama de verdade fora
// de foco (sem nenhuma linha de marcação — aprovado assim depois de duas
// rodadas: a versão com linhas em perspectiva lia como diagrama, não
// atmosfera) + torres de refletor pulsando bem devagar. Puro CSS/SVG, sem
// lib, sem imagem pesada. Decorativo, então aria-hidden.
export default function NightPitchBackground() {
  return (
    <div className="pl-night-pitch" aria-hidden="true">
      <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="pl-night-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0c07" />
            <stop offset="55%" stopColor="#0a0a08" />
            <stop offset="100%" stopColor="#0A0A0A" />
          </linearGradient>
          <linearGradient id="pl-night-grass" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#1b2e12" />
            <stop offset="45%" stopColor="#152510" />
            <stop offset="100%" stopColor="#0a1207" />
          </linearGradient>
          <radialGradient id="pl-flood-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(230,255,200,0.95)" />
            <stop offset="35%" stopColor="rgba(230,255,200,0.55)" />
            <stop offset="100%" stopColor="rgba(230,255,200,0)" />
          </radialGradient>
          <radialGradient id="pl-flood-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(200,255,160,0.28)" />
            <stop offset="100%" stopColor="rgba(200,255,160,0)" />
          </radialGradient>
          <linearGradient id="pl-flood-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(230,255,200,0.16)" />
            <stop offset="100%" stopColor="rgba(230,255,200,0)" />
          </linearGradient>
          <filter id="pl-grass-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          <filter id="pl-beam-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <rect x="0" y="0" width="400" height="800" fill="url(#pl-night-sky)" />

        <rect x="0" y="0" width="400" height="800" fill="url(#pl-night-grass)" />
        <g filter="url(#pl-grass-blur)">
          <ellipse cx="90" cy="560" rx="150" ry="130" fill="#274a16" opacity="0.55" />
          <ellipse cx="330" cy="360" rx="170" ry="160" fill="#1c3410" opacity="0.5" />
          <ellipse cx="230" cy="680" rx="190" ry="110" fill="#0e1c09" opacity="0.6" />
          <ellipse cx="60" cy="220" rx="130" ry="150" fill="#20390f" opacity="0.4" />
          <ellipse cx="340" cy="700" rx="140" ry="120" fill="#18280e" opacity="0.45" />
        </g>

        <g>
          <ellipse cx="30" cy="60" rx="120" ry="180" fill="url(#pl-flood-beam)" filter="url(#pl-beam-blur)" />
          <rect x="27" y="70" width="4" height="120" fill="#12140f" />
          <rect x="6" y="34" width="48" height="30" rx="4" fill="#12140f" />
          <ellipse className="pl-lamp-beam" cx="30" cy="46" rx="70" ry="90" fill="url(#pl-flood-halo)" />
          <circle className="pl-lamp-core" cx="30" cy="46" r="17" fill="url(#pl-flood-core)" />
        </g>
        <g>
          <ellipse cx="370" cy="60" rx="120" ry="180" fill="url(#pl-flood-beam)" filter="url(#pl-beam-blur)" />
          <rect x="369" y="70" width="4" height="120" fill="#12140f" />
          <rect x="346" y="34" width="48" height="30" rx="4" fill="#12140f" />
          <ellipse className="pl-lamp-beam pl-r" cx="370" cy="46" rx="70" ry="90" fill="url(#pl-flood-halo)" />
          <circle className="pl-lamp-core pl-r" cx="370" cy="46" r="17" fill="url(#pl-flood-core)" />
        </g>
      </svg>
      <div className="pl-night-vignette" />
    </div>
  );
}
