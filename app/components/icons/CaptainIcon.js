export default function CaptainIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }}
      aria-hidden="true"
    >
      <path d="M4 9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V9z" stroke="var(--gold)" strokeWidth="1.6" fill="none" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="var(--gold)" strokeWidth="1.6" />
    </svg>
  );
}
