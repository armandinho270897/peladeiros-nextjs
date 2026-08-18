export default function OnboardingConfirmarIcon({ width = 160 }) {
  return (
    <svg width={width} height={(width * 120) / 160} viewBox="0 0 160 120" fill="none" aria-hidden="true">
      <path
        d="M20 40a6 6 0 0 1 6-6h108a6 6 0 0 1 6 6v6a8 8 0 0 0 0 16v6a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6v-6a8 8 0 0 0 0-16z"
        fill="var(--card-bg)" stroke="var(--gold)" strokeWidth="1.5"
      />
      <line x1="60" y1="34" x2="60" y2="86" stroke="var(--gold)" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
      <path d="M85 60l10 10 20-22" stroke="var(--neon)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
