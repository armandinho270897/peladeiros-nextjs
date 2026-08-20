export default function BackArrowIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }}
      aria-hidden="true"
    >
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
