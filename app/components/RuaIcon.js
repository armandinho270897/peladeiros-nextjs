export default function RuaIcon({ size = 21 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 20L9 4h2l-6 16H3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15 4l6 16h-2l-6-16h2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="10.5" y1="12" x2="13.5" y2="12" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.6 1.6" />
      <circle cx="12" cy="17" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
