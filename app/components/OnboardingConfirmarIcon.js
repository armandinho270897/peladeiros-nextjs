// Faíscas neon saem do centro do check quando ele "pop"a — dá sensação
// de conquista/vaga garantida em vez de só aparecer estático.
const FAISCAS = [
  { dx: 0, dy: -18 }, { dx: 16, dy: -9 }, { dx: 18, dy: 6 },
  { dx: 6, dy: 18 }, { dx: -12, dy: 14 }, { dx: -17, dy: -4 },
];

export default function OnboardingConfirmarIcon({ width = 160 }) {
  const ticketPath = 'M20 40a6 6 0 0 1 6-6h108a6 6 0 0 1 6 6v6a8 8 0 0 0 0 16v6a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6v-6a8 8 0 0 0 0-16z';
  return (
    <svg width={width} height={(width * 120) / 160} viewBox="0 0 160 120" fill="none" aria-hidden="true">
      <path d={ticketPath} fill="var(--card-bg)" className="pl-onb-fill" />
      <path pathLength="1" d={ticketPath} fill="none" stroke="var(--gold)" strokeWidth="1.5" className="pl-onb-draw" />
      <line x1="60" y1="34" x2="60" y2="86" stroke="var(--gold)" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" className="pl-onb-fill" />
      <path pathLength="1" d="M85 60l10 10 20-22" stroke="var(--neon)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="pl-onb-check" />
      {FAISCAS.map((f, i) => (
        <circle
          key={i} cx="100" cy="59" r="2.2" fill="var(--neon)" className="pl-onb-spark"
          style={{ '--sx': `${f.dx}px`, '--sy': `${f.dy}px`, animationDelay: `${1080 + i * 12}ms` }}
        />
      ))}
    </svg>
  );
}
