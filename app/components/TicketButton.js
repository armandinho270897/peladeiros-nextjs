'use client';

export default function TicketButton({ children, compact, className, ...props }) {
  return (
    <button {...props} className={`pl-ticket ${compact ? 'pl-ticket-compact' : ''} ${className || ''}`}>
      <span className="pl-ticket-label">{children}</span>
      <span className="pl-ticket-stub" aria-hidden="true">⚽</span>
    </button>
  );
}
