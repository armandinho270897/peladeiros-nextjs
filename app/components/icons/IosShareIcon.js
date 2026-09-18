export default function IosShareIcon({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="14" y="24" width="36" height="30" rx="6" stroke="var(--neon)" strokeWidth="2" />
      <path d="M32 10v26" stroke="var(--neon)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M22 19l10-10 10 10" stroke="var(--neon)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
