export default function ConquistaPrimeiraPeladaIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill="var(--card-bg)" stroke="var(--gold)" strokeWidth="2" />
      <circle cx="32" cy="32" r="27" fill="none" stroke="var(--gold)" strokeWidth="1" strokeDasharray="1.5 3.5" opacity="0.6" />
      <circle cx="32" cy="30" r="11" fill="var(--neon)" stroke="var(--ink)" strokeWidth="1.5" />
      <path d="M32 22l4.5 3.2-1.7 5.3h-5.6l-1.7-5.3z" fill="var(--ink)" strokeLinejoin="round" />
      <path d="M32 22v-3.5M36.5 25.2l3.3-2.2M30.8 30.5l2.7 3M27 30.5l-2.7 3M27.5 25.2l-3.3-2.2" stroke="var(--ink)" strokeWidth="1" />
      <path d="M18 46c3-2.5 25-2.5 28 0" stroke="rgba(243,243,238,0.25)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
