export default function PeladasCampoIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="6" width="17.6" height="12" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.2 9.6h2.6v4.8H3.2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M20.8 9.6h-2.6v4.8h2.6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
