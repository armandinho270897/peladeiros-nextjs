'use client';

const CORES = ['var(--neon)', 'var(--gold)'];
const N = 24;

// Confete leve em CSS puro (sem lib nova) — disparado uma vez quando a
// pelada acabou de lotar, some sozinho.
export default function Confetti() {
  const pieces = Array.from({ length: N }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 200,
    duration: 900 + Math.random() * 500,
    color: CORES[i % 2],
  }));

  return (
    <div className="pl-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="pl-confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
          }}
        />
      ))}
    </div>
  );
}
