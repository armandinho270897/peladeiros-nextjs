export default function OnboardingAvaliarIcon({ width = 160 }) {
  return (
    <svg width={width} height={(width * 120) / 160} viewBox="0 0 160 120" fill="none" aria-hidden="true">
      <path
        d="M80 22l11 22 24 3.5-17.5 17 4 24L80 77l-21.5 11.5 4-24-17.5-17 24-3.5z"
        fill="var(--gold)" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round"
      />
      <circle cx="80" cy="105" r="3" fill="rgba(243,243,238,0.3)" />
      <circle cx="60" cy="108" r="2" fill="rgba(243,243,238,0.2)" />
      <circle cx="100" cy="108" r="2" fill="rgba(243,243,238,0.2)" />
    </svg>
  );
}
