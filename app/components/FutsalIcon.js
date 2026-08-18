export default function FutsalIcon({ size = 21 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 9.5a3 3 0 0 1 0 5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M21.5 9.5a3 3 0 0 0 0 5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
