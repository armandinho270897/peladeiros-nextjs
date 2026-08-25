export default function QuadraIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="6" width="17.6" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
