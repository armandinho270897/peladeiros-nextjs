// Faíscas neon saem do selo quando ele "pop"a — dá sensação de
// conquista/vaga garantida em vez de só aparecer estático.
const FAISCAS = [
  { dx: 0, dy: -20 }, { dx: 17, dy: -10 }, { dx: 19, dy: 7 },
  { dx: 7, dy: 20 }, { dx: -13, dy: 15 }, { dx: -18, dy: -5 },
];

// V2: o ticket em cor chapada (var(--card-bg), quase a mesma luminância
// do cenário atrás) somado a um check fino sem peso nenhum lia como
// "rascunho" — trocado por corpo com gradiente + sombra (o ticket ganha
// profundidade, se destaca do fundo) e o check virou um selo cheio
// (bolinha neon com gradiente + check grosso em ink), que também dá um
// alvo melhor pro pop + faíscas já existentes.
export default function OnboardingConfirmarIcon({ width = 160 }) {
  const ticketPath = 'M20 40a6 6 0 0 1 6-6h108a6 6 0 0 1 6 6v6a8 8 0 0 0 0 16v6a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6v-6a8 8 0 0 0 0-16z';
  return (
    <svg width={width} height={(width * 120) / 160} viewBox="0 0 160 120" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="pl-onb-ticket-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,197,61,0.26)" />
          <stop offset="100%" stopColor="rgba(255,197,61,0)" />
        </radialGradient>
        <linearGradient id="pl-onb-ticket-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#312A21" />
          <stop offset="100%" stopColor="#15130F" />
        </linearGradient>
        <radialGradient id="pl-onb-badge-grad" cx="34%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#E4FFA3" />
          <stop offset="100%" stopColor="var(--neon)" />
        </radialGradient>
        <filter id="pl-onb-ticket-shadow" x="-30%" y="-40%" width="160%" height="200%">
          <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#000" floodOpacity="0.5" />
        </filter>
        <linearGradient id="pl-onb-ticket-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <clipPath id="pl-onb-ticket-clip">
          <path d={ticketPath} />
        </clipPath>
      </defs>

      <ellipse cx="80" cy="54" rx="60" ry="36" fill="url(#pl-onb-ticket-glow)" />

      <g filter="url(#pl-onb-ticket-shadow)">
        <path d={ticketPath} fill="url(#pl-onb-ticket-body)" className="pl-onb-fill" />
        <path pathLength="1" d={ticketPath} fill="none" stroke="var(--gold)" strokeWidth="1.5" className="pl-onb-draw" />
      </g>
      {/* brilho de "verniz" preso ao formato do ticket via clipPath — a
          versão anterior era um traço solto por cima, sem recorte, e
          flutuava visivelmente acima da borda dourada (lia como risco
          acidental, não como brilho). */}
      <g clipPath="url(#pl-onb-ticket-clip)" className="pl-onb-fill">
        <rect x="20" y="34" width="120" height="20" fill="url(#pl-onb-ticket-sheen)" />
      </g>

      {/* ticket desenha de y=34 (topo) a y=74 (base) — altura real 40,
          não 52. Divisória, código de barras e selo têm que caber
          dentro disso; antes estavam calculados pra uma altura errada
          e o selo chegava a passar 1.5px do fundo do ticket. */}
      {/* picote "rasga" ao vivo (scaleY a partir do centro) em vez de só
          aparecer — usar stroke-dasharray/pathLength pra isso quebraria
          o padrão tracejado "3 4" (propriedade CSS de dasharray venceria
          o atributo e viraria uma linha sólida), por isso é transform. */}
      <line x1="60" y1="34" x2="60" y2="74" stroke="var(--gold)" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" className="pl-onb-tear" />
      <g className="pl-onb-fill" opacity="0.55">
        <line x1="30" y1="43" x2="30" y2="65" stroke="var(--paper-dim)" strokeWidth="1.2" />
        <line x1="34" y1="43" x2="34" y2="65" stroke="var(--paper-dim)" strokeWidth="2" />
        <line x1="38" y1="43" x2="38" y2="65" stroke="var(--paper-dim)" strokeWidth="1.2" />
        <line x1="42" y1="43" x2="42" y2="65" stroke="var(--paper-dim)" strokeWidth="1.6" />
        <line x1="46" y1="43" x2="46" y2="65" stroke="var(--paper-dim)" strokeWidth="1.2" />
        <line x1="50" y1="43" x2="50" y2="65" stroke="var(--paper-dim)" strokeWidth="1.5" />
      </g>

      <g className="pl-onb-badge">
        <circle cx="100" cy="54" r="14" fill="url(#pl-onb-badge-grad)" />
        <path d="M92 54.5l5.6 5.6L110.5 46" stroke="var(--ink)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {FAISCAS.map((f, i) => (
        <circle
          key={i} cx="100" cy="54" r="2.2" fill="var(--neon)" className="pl-onb-spark"
          style={{ '--sx': `${f.dx}px`, '--sy': `${f.dy}px`, animationDelay: `${600 + i * 12}ms` }}
        />
      ))}
    </svg>
  );
}
