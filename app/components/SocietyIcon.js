export default function SocietyIcon({ size = 21 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4v13M20 4v13M4 4h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 9h16M4 13h16M9 4v13M14.5 4v13" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
