// Pino com "ping" de radar — troca o diagrama de campo em linha (achado
// visualmente sem graça, "só linhas", sentado sobre um fundo vazio) por
// algo que já lê como "achando pelada perto de você" de cara, e que faz
// sentido por cima do cenário de quadra à noite (NightPitchBackground)
// que passou a ficar atrás de todo o onboarding.
export default function OnboardingDescobrirIcon({ width = 160 }) {
  const pinPath = 'M80 22c-14.9 0-27 12-27 27 0 20 27 45 27 45s27-25 27-45c0-15-12.1-27-27-27z';
  return (
    <svg width={width} height={(width * 120) / 160} viewBox="0 0 160 120" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="pl-onb-pin-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(200,255,120,0.55)" />
          <stop offset="100%" stopColor="rgba(200,255,120,0)" />
        </radialGradient>
        <radialGradient id="pl-onb-pin-body" cx="34%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#E4FFA3" />
          <stop offset="100%" stopColor="var(--neon)" />
        </radialGradient>
        <filter id="pl-onb-pin-shadow" x="-50%" y="-20%" width="200%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>
      <ellipse cx="80" cy="96" rx="46" ry="10" fill="url(#pl-onb-pin-glow)" />
      <circle className="pl-onb-radar-ring" cx="80" cy="96" r="14" stroke="var(--neon)" strokeWidth="1.5" opacity="0.6" />
      <circle className="pl-onb-radar-ring pl-onb-radar-ring-2" cx="80" cy="96" r="14" stroke="var(--neon)" strokeWidth="1.5" opacity="0.6" />
      <g filter="url(#pl-onb-pin-shadow)">
        <path d={pinPath} fill="url(#pl-onb-pin-body)" className="pl-onb-fill" />
        <path pathLength="1" d={pinPath} fill="none" stroke="var(--ink)" strokeWidth="2" className="pl-onb-draw" />
        <circle cx="80" cy="49" r="10" fill="var(--ink)" stroke="none" className="pl-onb-fill" />
      </g>
    </svg>
  );
}
