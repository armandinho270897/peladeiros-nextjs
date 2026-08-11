'use client';
import { useState } from 'react';

export default function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div style={{ display: 'inline-flex', gap: 2 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            fontSize: 22,
            lineHeight: 1,
            color: n <= shown ? 'var(--gold)' : 'rgba(243,243,238,0.25)',
            transition: 'color 120ms ease, transform 120ms ease',
            transform: n <= shown ? 'scale(1.08)' : 'scale(1)',
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}
