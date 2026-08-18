export default function ConquistaCincoPeladasIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill="var(--card-bg)" stroke="var(--gold)" strokeWidth="2" />
      <circle cx="32" cy="32" r="27" fill="none" stroke="var(--gold)" strokeWidth="1" strokeDasharray="1.5 3.5" opacity="0.6" />
      <path
        d="M32 18c-1 4-6 6-6 12a6 6 0 0 0 12 0c0-2-1-3-2-4 0 2-1 3-2 3-2 0-2-2-1-4 1-2 0-5-1-7z"
        fill="var(--gold)" stroke="var(--ink)" strokeWidth="1.3" strokeLinejoin="round"
      />
      <path d="M18 46c3-2.5 25-2.5 28 0" stroke="rgba(243,243,238,0.25)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
