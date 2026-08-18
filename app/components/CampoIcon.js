export default function CampoIcon({ size = 21 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="14" r="5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13 11.5 19 8a2 2 0 0 1 2.7.8l.1.2a2 2 0 0 1-.9 2.7L15 14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8.5" y1="11.5" x2="8.5" y2="14" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
