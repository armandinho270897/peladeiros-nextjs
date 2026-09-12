export default function ConquistaPresencaDeFerroIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill="var(--card-bg)" stroke="var(--gold)" strokeWidth="2" />
      <circle cx="32" cy="32" r="27" fill="none" stroke="var(--gold)" strokeWidth="1" strokeDasharray="1.5 3.5" opacity="0.6" />
      <path
        d="M32 15l12 4v13c0 9-6 14.5-12 17.5C26 46.5 20 41 20 32V19z"
        fill="var(--gold)" stroke="var(--ink)" strokeWidth="1.3" strokeLinejoin="round"
      />
      <path d="M25.5 31.5l4.5 4.5 9-10" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 46c3-2.5 25-2.5 28 0" stroke="rgba(243,243,238,0.25)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
