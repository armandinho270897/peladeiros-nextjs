export default function ConquistaAvaliacaoCincoIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill="var(--card-bg)" stroke="var(--gold)" strokeWidth="2" />
      <circle cx="32" cy="32" r="27" fill="none" stroke="var(--gold)" strokeWidth="1" strokeDasharray="1.5 3.5" opacity="0.6" />
      <path
        d="M32 16l4.2 8.6 9.5 1.4-6.9 6.7 1.6 9.5-8.4-4.4-8.4 4.4 1.6-9.5-6.9-6.7 9.5-1.4z"
        fill="var(--gold)" stroke="var(--ink)" strokeWidth="1.3" strokeLinejoin="round"
      />
      <path d="M18 46c3-2.5 25-2.5 28 0" stroke="rgba(243,243,238,0.25)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
