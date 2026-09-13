'use client';

// Marca d'água da aba ativa — agora fixa no centro da barra (é o ITEM que
// viaja até lá, via o carrossel em BottomNav.js), não a bola cruzando a
// barra inteira. Ela só faz uma pequena trajetória própria — pulso curto
// de escala+fade+leve giro — toda vez que o centro muda. BottomNav.js
// força isso remontando o componente com `key={centeredIndex}` a cada
// troca; remontar reinicia a animação de "entrada" sozinho, sem precisar
// de ref/classe alternada em JS.
//
// Mesmo desenho "neo-futsal" do ciclo anterior (geometria abstrata,
// gradiente radial de volume, anel de borda) — só a POSIÇÃO mudou.
export default function BottomNavBall({ reduzido }) {
  return (
    <span className={`pl-nav-ball-track ${reduzido ? 'pl-nav-ball-reduzido' : ''}`} aria-hidden="true">
      <svg className="pl-nav-ball-svg" viewBox="0 0 32 32">
        <defs>
          <radialGradient id="pnb-corpo" cx="36%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#EEFFC2" />
            <stop offset="32%" stopColor="#A6FF00" />
            <stop offset="68%" stopColor="#3A6300" />
            <stop offset="100%" stopColor="#0A1200" />
          </radialGradient>
          <radialGradient id="pnb-anel" cx="50%" cy="50%" r="50%">
            <stop offset="79%" stopColor="rgba(166,255,0,0)" />
            <stop offset="100%" stopColor="rgba(212,255,107,0.95)" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="12.4" fill="url(#pnb-corpo)" />
        <path d="M5.2 14 Q16 8.4 26.8 14.6" fill="none" stroke="#081000" strokeOpacity="0.55" strokeWidth="1.15" strokeLinecap="round" />
        <path d="M5.2 13.2 Q16 7.6 26.8 13.8" fill="none" stroke="#E4FFA8" strokeOpacity="0.4" strokeWidth="0.45" strokeLinecap="round" />
        <path d="M6.4 21.4 Q16 26.2 25.6 20.6" fill="none" stroke="#081000" strokeOpacity="0.45" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M15.15 8.6L17.05 8.9 18.35 23.1 14.05 23.3Z" fill="#081000" opacity="0.32" />
        <ellipse cx="11.6" cy="10.4" rx="3.1" ry="1.9" fill="#F6FFE4" opacity="0.42" />
        <circle cx="16" cy="16" r="12.4" fill="none" stroke="url(#pnb-anel)" strokeWidth="1.1" />
      </svg>
    </span>
  );
}
