// Ilustração de fundo do card de pelada — 5 padrões gráficos no estilo
// grafite/giz já usado em BolaParadaIcon/Onboarding*Icon (linha fina,
// var(--paper) em opacidade baixa). Escolha determinística pelo id da
// pelada (mesmo hash sempre cai no mesmo padrão) — não sorteia de novo a
// cada carregamento, senão vira ruído visual em vez de identidade.
const COR = 'rgba(243,243,238,0.09)';

function CampoPattern() {
  return (
    <svg width="150" height="100%" viewBox="0 0 150 220" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      <line x1="10" y1="70" x2="150" y2="70" stroke={COR} strokeWidth="1.5" />
      <circle cx="80" cy="70" r="26" stroke={COR} strokeWidth="1.5" />
      <circle cx="80" cy="70" r="2" fill={COR} />
      <rect x="118" y="30" width="55" height="80" stroke={COR} strokeWidth="1.5" />
      <rect x="118" y="52" width="26" height="36" stroke={COR} strokeWidth="1.5" />
    </svg>
  );
}

function BolaPattern() {
  return (
    <svg width="140" height="100%" viewBox="0 0 140 220" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      <circle cx="85" cy="100" r="34" stroke={COR} strokeWidth="1.5" />
      <path d="M85 76l10 7.2-4 12.3H79l-4-12.3z" stroke={COR} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M85 76v-9M104 89.6l9.4-6M96.3 111l6.5 8.2M73.7 111l-6.5 8.2M66 89.6l-9.4-6" stroke={COR} strokeWidth="1" />
      <path d="M30 40q40 20 0 60M150 150q-40-20 0-60" stroke={COR} strokeWidth="1.2" />
    </svg>
  );
}

function RedePattern() {
  const lines = [];
  for (let i = -6; i <= 10; i++) {
    lines.push(<line key={`a${i}`} x1={i * 16} y1="0" x2={i * 16 + 160} y2="220" stroke={COR} strokeWidth="1" />);
    lines.push(<line key={`b${i}`} x1={i * 16 + 160} y1="0" x2={i * 16} y2="220" stroke={COR} strokeWidth="1" />);
  }
  return (
    <svg width="150" height="100%" viewBox="0 0 150 220" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      {lines}
    </svg>
  );
}

function QuadraPattern() {
  return (
    <svg width="150" height="100%" viewBox="0 0 150 220" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      <line x1="20" y1="0" x2="20" y2="220" stroke={COR} strokeWidth="1.5" />
      <line x1="60" y1="0" x2="60" y2="220" stroke={COR} strokeWidth="1.5" strokeDasharray="4 6" />
      <line x1="100" y1="0" x2="100" y2="220" stroke={COR} strokeWidth="1.5" strokeDasharray="4 6" />
      <path d="M20 60a40 40 0 0 1 40 40" stroke={COR} strokeWidth="1.5" />
      <path d="M20 160a40 40 0 0 0 40-40" stroke={COR} strokeWidth="1.5" />
    </svg>
  );
}

function BandeirinhaPattern() {
  return (
    <svg width="140" height="100%" viewBox="0 0 140 220" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      <path d="M110 20v130" stroke={COR} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M110 20l24 12-24 12z" stroke={COR} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M110 150a40 40 0 0 1-40-40" stroke={COR} strokeWidth="1.5" />
      <line x1="40" y1="70" x2="40" y2="0" stroke={COR} strokeWidth="1.5" />
      <line x1="110" y1="150" x2="150" y2="150" stroke={COR} strokeWidth="1.5" />
    </svg>
  );
}

const PADROES = [CampoPattern, BolaPattern, RedePattern, QuadraPattern, BandeirinhaPattern];

function hashId(id) {
  let h = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function CardIllustration({ gameId }) {
  const Padrao = PADROES[hashId(gameId) % PADROES.length];
  return (
    <div className="pl-card-illustration">
      <Padrao />
    </div>
  );
}
