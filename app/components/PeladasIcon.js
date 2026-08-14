export default function PeladasIcon({ size = 21 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8.3l3 2.2-1.1 3.4h-3.8L9 10.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path
        d="M12 8.3V5.5M13.9 13.9l2.5 1.8M10.1 13.9l-2.5 1.8M8.9 10.5l-2.7-.5M15.1 10.5l2.7-.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
