import Link from 'next/link';

// Estado vazio padrão do app (Peladas, Minhas peladas, Times, Perfil): um
// cartão de gramado noturno com uma cena riscada a giz + a bola neon com o
// "P" de Peladeiros. Cada tela escolhe a cena que combina com o vazio dela;
// o texto e os botões vêm de fora (children), pra não repetir na tela um
// controle que ela já mostra logo acima.

const n = (v) => Number(v.toFixed(1));

function Bola({ cx, cy, r, anim }) {
  return (
    <g className={`pl-vazio-bola ${anim}`}>
      <circle className="pl-vazio-bola-corpo" cx={cx} cy={cy} r={r} strokeWidth={n(r / 9.6)} />
      <path
        className="pl-vazio-bola-brilho"
        d={`M${n(cx - r * 0.68)} ${n(cy - r * 0.44)}a${n(r * 0.84)} ${n(r * 0.84)} 0 0 1 ${n(r * 0.68)} ${n(-r * 0.4)}`}
        fill="none" strokeWidth={n(r / 8)} strokeLinecap="round"
      />
      <text className="pl-vazio-bola-p" x={cx} y={n(cy + r * 0.45)} textAnchor="middle" fontSize={n(r * 1.36)}>P</text>
    </g>
  );
}

function Sombra({ cx, cy, rx }) {
  return <ellipse className="pl-vazio-sombra" cx={cx} cy={cy} rx={rx} ry={n(rx * 0.25)} fill="rgba(0,0,0,.55)" />;
}

// Campo riscado a giz (as linhas "se desenham" ao abrir a tela).
function Campo({ y0, h }) {
  const cy = y0 + h / 2;
  return (
    <>
      <rect className="pl-vazio-giz" pathLength="1" x="12" y={y0} width="276" height={h} rx="6" />
      <line className="pl-vazio-giz d2" pathLength="1" x1="150" y1={y0} x2="150" y2={y0 + h} />
      <circle className="pl-vazio-giz d2" pathLength="1" cx="150" cy={cy} r="22" />
      <rect className="pl-vazio-giz d3" pathLength="1" x="12" y={cy - 31} width="34" height="62" />
      <rect className="pl-vazio-giz d3" pathLength="1" x="254" y={cy - 31} width="34" height="62" />
      <rect className="pl-vazio-giz d3" pathLength="1" x="12" y={cy - 15} width="14" height="30" />
      <rect className="pl-vazio-giz d3" pathLength="1" x="274" y={cy - 15} width="14" height="30" />
    </>
  );
}

const LADO_A = [[34, 75], [74, 42], [74, 108], [112, 58], [112, 92]];
const LADO_B = [[266, 75], [226, 42], [226, 108], [188, 58], [188, 92]];

function Vagas({ posicoes }) {
  return posicoes.map(([x, y], i) => (
    <circle key={`${x}-${y}`} className="pl-vazio-vaga" style={{ animationDelay: `${(i % 5) * 0.35}s` }} cx={x} cy={y} r="8" />
  ));
}

// Todas as cenas usam o mesmo viewBox (300x150): o tamanho na tela é sempre
// o mesmo, só muda o desenho.
const CENAS = {
  // bola quicando no meio do campo (Peladas)
  campo: () => (
    <>
      <Campo y0={14} h={122} />
      <Sombra cx={150} cy={88} rx={13} />
      <Bola cx={150} cy={75} r={12.5} anim="pl-vazio-quica" />
    </>
  ),
  // bola descansando no banco de reservas (Minhas peladas)
  banco: () => (
    <>
      <Campo y0={6} h={84} />
      <g className="pl-vazio-linha">
        <rect x="96" y="128" width="108" height="7" rx="2" />
        <line x1="108" y1="135" x2="108" y2="148" />
        <line x1="192" y1="135" x2="192" y2="148" />
      </g>
      <Sombra cx={150} cy={128} rx={15} />
      <Bola cx={150} cy={115.5} r={12.5} anim="pl-vazio-quica-leve" />
    </>
  ),
  // formação em vagas tracejadas esperando jogador (Meus times)
  formacao: () => (
    <>
      <Campo y0={14} h={122} />
      <Vagas posicoes={LADO_A} />
      <Sombra cx={150} cy={88} rx={13} />
      <Bola cx={150} cy={75} r={12.5} anim="pl-vazio-quica" />
    </>
  ),
  // as duas formações vazias (Times abertos)
  vestiario: () => (
    <>
      <Campo y0={14} h={122} />
      <Vagas posicoes={[...LADO_A, ...LADO_B]} />
      <Sombra cx={150} cy={88} rx={13} />
      <Bola cx={150} cy={75} r={12.5} anim="pl-vazio-quica" />
    </>
  ),
  // a bola rolou pra fora do campo (busca sem resultado)
  fora: () => (
    <>
      <Campo y0={6} h={104} />
      <path className="pl-vazio-linha" d="M171 66Q216 98 243 128" strokeDasharray="2 6" />
      <Sombra cx={250} cy={146.5} rx={12} />
      <Bola cx={250} cy={136} r={10.5} anim="pl-vazio-rola" />
    </>
  ),
};

function Placar() {
  return (
    <div className="pl-vazio-placar">
      <span className="pl-vazio-placar-num">0</span>
      <svg width="52" height="60" viewBox="0 0 52 60" aria-hidden="true">
        <Sombra cx={26} cy={52} rx={13} />
        <Bola cx={26} cy={30} r={13} anim="pl-vazio-quica" />
      </svg>
      <span className="pl-vazio-placar-num">0</span>
    </div>
  );
}

export default function EmptyState({ cena = 'campo', marca, titulo, sub, children }) {
  // Cai pro campo padrão se vier uma cena que não existe (typo, tela nova
  // ainda sem cena própria) — melhor um desenho genérico do que a tela
  // inteira quebrar tentando renderizar um componente undefined.
  const Cena = CENAS[cena] || CENAS.campo;
  return (
    <div className="pl-list pl-vazio-wrap">
      <div className="pl-vazio">
        {cena === 'placar' ? (
          <>
            <Placar />
            <div className="pl-vazio-rotulo">Placar da carreira</div>
          </>
        ) : (
          <svg className="pl-vazio-cena" viewBox="0 0 300 150" aria-hidden="true"><Cena /></svg>
        )}
        <span className="pl-vazio-marca">{marca}</span>
        <h3 className="pl-vazio-titulo">{titulo}</h3>
        <p className="pl-vazio-sub">{sub}</p>
        {children && <div className="pl-vazio-acoes">{children}</div>}
      </div>
    </div>
  );
}

// Botão principal (ticket neon): link quando tem href, botão quando tem onClick.
export function EmptyAcao({ href, onClick, children }) {
  const miolo = (
    <>
      <span className="pl-ticket-label">{children}</span>
      <span className="pl-ticket-stub" aria-hidden="true">⚽</span>
    </>
  );
  return href
    ? <Link href={href} className="pl-ticket" style={{ textDecoration: 'none' }}>{miolo}</Link>
    : <button type="button" className="pl-ticket" onClick={onClick}>{miolo}</button>;
}

export function EmptyLink({ onClick, children }) {
  return <button type="button" className="pl-vazio-link" onClick={onClick}>{children}</button>;
}
