'use client';

// Indicador do item ativo — uma bola neon discreta, fixa no centro exato
// da barra (mesma âncora CSS "left:50%" que o item central usa, então os
// dois sempre coincidem no eixo, em qualquer largura de tela). É o ITEM
// que viaja até ela (via o carrossel em BottomNav.js), não o contrário:
// ela só troca de opacidade com um fade curto e calmo — sem pulso de
// escala, sem giro — toda vez que o centro muda. BottomNav.js força isso
// remontando o componente com `key={centro}`, então remontar já reproduz
// o fade sozinho, sem precisar de ref/classe alternada em JS.
export default function BottomNavBall({ reduzido }) {
  return (
    <span className={`pl-nav-ball-track ${reduzido ? 'pl-nav-ball-reduzido' : ''}`} aria-hidden="true">
      <svg className="pl-nav-ball-svg" viewBox="0 0 32 32">
        <defs>
          <radialGradient id="pnb-corpo" cx="36%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#DFFFA0" />
            <stop offset="34%" stopColor="#96E600" />
            <stop offset="70%" stopColor="#335400" />
            <stop offset="100%" stopColor="#0A1200" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="11.6" fill="url(#pnb-corpo)" />
        <path d="M5.6 14 Q16 9 26.4 14.4" fill="none" stroke="#081000" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
        <path d="M6.6 21 Q16 25.2 25.4 20.4" fill="none" stroke="#081000" strokeOpacity="0.4" strokeWidth="0.95" strokeLinecap="round" />
        <ellipse cx="11.8" cy="10.8" rx="2.6" ry="1.6" fill="#F2FFDD" opacity="0.32" />
      </svg>
    </span>
  );
}
