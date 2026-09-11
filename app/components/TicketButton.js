'use client';

export default function TicketButton({ children, compact, className, ...props }) {
  return (
    <button {...props} className={`pl-ticket ${compact ? 'pl-ticket-compact' : ''} ${className || ''}`}>
      <span className="pl-ticket-label">{children}</span>
      <span className="pl-ticket-stub" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9.5" stroke="var(--ink)" strokeWidth="1.6" />
          <path d="M12 7.2l3.8 2.76-1.45 4.48H9.65L8.2 9.96z" fill="var(--ink)" />
          <path d="M12 3.5v3.2M5.1 8.4l2.9 2.1M18.9 8.4l-2.9 2.1M8.3 19l1.35-4.16M15.7 19l-1.35-4.16" stroke="var(--ink)" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </span>
    </button>
  );
}
