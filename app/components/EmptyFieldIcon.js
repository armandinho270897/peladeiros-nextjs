export default function EmptyFieldIcon({ width = 140 }) {
  return (
    <svg
      width={width}
      height={(width * 84) / 140}
      viewBox="0 0 200 120"
      fill="none"
      stroke="rgba(243,243,238,0.35)"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="10" y="10" width="180" height="100" rx="4" />
      <line x1="100" y1="10" x2="100" y2="110" />
      <circle cx="100" cy="60" r="18" />
      <circle cx="100" cy="60" r="1.6" fill="rgba(243,243,238,0.35)" stroke="none" />
      <rect x="10" y="34" width="24" height="52" />
      <rect x="166" y="34" width="24" height="52" />
    </svg>
  );
}
