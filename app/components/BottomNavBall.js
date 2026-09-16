'use client';
import { useId } from 'react';

// Bola neon "neo-futsal" que marca a aba ativa — desenho original de
// bd44075 (removido quando a nav era um carrossel), agora como marca
// d'água atrás do ícone de CADA item (um por slot da grade fixa),
// aparecendo via opacity/scale quando o item ganha .active. Embrulhada
// num <span> (pl-nav-ball-wrap) em vez de um <svg> solto: o ícone real de
// cada aba também é um <svg> filho direto de .nav-icon-shell, e um
// seletor tipo ".nav-icon-shell > svg" pra mirar só nele precisa que a
// bola NÃO seja outro <svg> irmão — senão os dois colidem na mesma regra.
// useId garante gradientes com id único por instância — sem isso, as 5
// bolas montadas ao mesmo tempo colidiriam no mesmo <defs>.
export default function BottomNavBall() {
  const id = useId();
  const corpoId = `pnb-corpo-${id}`;
  const anelId = `pnb-anel-${id}`;
  return (
    <span className="pl-nav-ball-wrap" aria-hidden="true">
      <svg className="pl-nav-ball-svg" viewBox="0 0 32 32">
        <defs>
          <radialGradient id={corpoId} cx="36%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#EEFFC2" />
            <stop offset="32%" stopColor="#A6FF00" />
            <stop offset="68%" stopColor="#3A6300" />
            <stop offset="100%" stopColor="#0A1200" />
          </radialGradient>
          <radialGradient id={anelId} cx="50%" cy="50%" r="50%">
            <stop offset="79%" stopColor="rgba(166,255,0,0)" />
            <stop offset="100%" stopColor="rgba(212,255,107,0.95)" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="12.4" fill={`url(#${corpoId})`} />
        <path d="M5.2 14 Q16 8.4 26.8 14.6" fill="none" stroke="#081000" strokeOpacity="0.55" strokeWidth="1.15" strokeLinecap="round" />
        <path d="M5.2 13.2 Q16 7.6 26.8 13.8" fill="none" stroke="#E4FFA8" strokeOpacity="0.4" strokeWidth="0.45" strokeLinecap="round" />
        <path d="M6.4 21.4 Q16 26.2 25.6 20.6" fill="none" stroke="#081000" strokeOpacity="0.45" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M15.15 8.6L17.05 8.9 18.35 23.1 14.05 23.3Z" fill="#081000" opacity="0.32" />
        <ellipse cx="11.6" cy="10.4" rx="3.1" ry="1.9" fill="#F6FFE4" opacity="0.42" />
        <circle cx="16" cy="16" r="12.4" fill="none" stroke={`url(#${anelId})`} strokeWidth="1.1" />
      </svg>
    </span>
  );
}
