export default function OnboardingDescobrirIcon({ width = 160 }) {
  return (
    <svg width={width} height={(width * 120) / 160} viewBox="0 0 160 120" fill="none" aria-hidden="true">
      <rect x="10" y="20" width="140" height="80" rx="4" stroke="rgba(243,243,238,0.3)" strokeWidth="1.5" />
      <line x1="80" y1="20" x2="80" y2="100" stroke="rgba(243,243,238,0.3)" strokeWidth="1.2" />
      <circle cx="80" cy="60" r="16" stroke="rgba(243,243,238,0.3)" strokeWidth="1.2" />
      <path d="M115 35c0-8-6.5-14-14-14s-14 6-14 14c0 10 14 24 14 24s14-14 14-24z" fill="var(--neon)" stroke="var(--ink)" strokeWidth="1.5" />
      <circle cx="101" cy="35" r="5" fill="var(--ink)" stroke="none" />
    </svg>
  );
}
