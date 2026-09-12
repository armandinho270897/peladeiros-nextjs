'use client';
import { useEffect, useRef, useState } from 'react';
import { flashClass } from '@/lib/tapFlash';

// Bola única que VIAJA entre setores, em vez de uma bola própria por item
// que só aparecia/sumia no lugar. Ela é a fonte única de verdade da "aba
// ativa" — pathname decide o índice (0-5, ver BottomNav.js), esse
// componente só cuida de onde desenhar e como se mover até lá.
//
// Tokens de motion centralizados aqui (não em CSS) porque a posição em si
// já é calculada em JS (não dá pra fazer sem medir a largura real da
// barra) — duração/easing/rotação por coluna moram juntos, num lugar só.
export const COLUNAS_NAV = 6;
const DURACAO_MS = 260;
const EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // overshoot curto e elegante, sem keyframe extra
const ROT_STEP_DEG = 7; // inclinação por coluna — ir pra direita soma, pra esquerda subtrai: é isso que dá a sensação de giro direcional
const ROT_CENTRO = (COLUNAS_NAV - 1) / 2;
const PULSO_MS = 280;
const PULSO_MS_REDUZIDO = 110;

function rotacaoDaColuna(indice) {
  return ((indice - ROT_CENTRO) * ROT_STEP_DEG).toFixed(1);
}

// Desenho "neo-futsal": geometria abstrata, não pentágonos clássicos —
// corpo em gradiente radial simulando volume de esfera (claro no canto
// onde bate luz, escurecendo pro canto oposto), dois cortes curvos tipo
// costura + um corte angular estreito no meio (referência abstrata a
// painel de bola, sem literalidade), realce especular discreto e anel de
// borda que só acende perto da borda (não uma mancha inteira). Viewbox
// maior (32) que o ícone real (34px na barra) só pra manter curvas limpas
// em qualquer escala.
function BolaSvg({ innerRef }) {
  return (
    <svg ref={innerRef} className="pl-nav-ball-svg" viewBox="0 0 32 32" aria-hidden="true">
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
  );
}

// prefers-reduced-motion lido em JS, não só via media query no CSS: a
// posição/rotação é aplicada como inline style (transform), e inline style
// sempre vence qualquer regra de folha de estilo pra essa mesma
// propriedade — um `transition: none` dentro do @media no CSS não
// derrubaria a duração/easing setados aqui embaixo. Então o próprio
// componente decide a duração certa antes de montar o style.
function useReducedMotion() {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduzido(mq.matches);
    const onChange = (e) => setReduzido(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduzido;
}

export default function BottomNavBall({ activeIndex }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [navWidth, setNavWidth] = useState(0);
  const prevIndexRef = useRef(null);
  const mountedRef = useRef(false);
  const reduzido = useReducedMotion();

  useEffect(() => {
    const nav = wrapRef.current?.closest('.pl-bottom-nav');
    if (!nav) return;
    const medir = () => setNavWidth(nav.getBoundingClientRect().width);
    medir();
    // ResizeObserver, não listener de window resize: a barra só existe
    // (display:flex/grid) abaixo de 700px — reagir só à largura DELA, não
    // da janela toda, evita recalcular sem necessidade em telas largas
    // onde ela nem está visível.
    const ro = new ResizeObserver(medir);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (activeIndex == null) return;
    // primeira pintura com uma aba ativa: só assenta na posição, sem
    // "viajar" de lugar nenhum (não existe posição anterior de verdade).
    if (mountedRef.current && prevIndexRef.current !== activeIndex) {
      flashClass(svgRef.current, 'pl-nav-ball-pulse-on', reduzido ? PULSO_MS_REDUZIDO : PULSO_MS);
    }
    prevIndexRef.current = activeIndex;
    mountedRef.current = true;
  }, [activeIndex, reduzido]);

  const visivel = activeIndex != null && navWidth > 0;
  const colWidth = navWidth / COLUNAS_NAV;
  const x = colWidth * (activeIndex ?? 0) + colWidth / 2;
  const rot = rotacaoDaColuna(activeIndex ?? 0);

  return (
    <span
      ref={wrapRef}
      className="pl-nav-ball-track"
      aria-hidden="true"
      style={{
        // só força opacidade quando precisa ESCONDER de vez (rota sem aba
        // correspondente) — quando visível, a opacidade de repouso vem do
        // token --nav-ball-opacity no CSS, não fica duplicada aqui.
        ...(visivel ? {} : { opacity: 0 }),
        transform: `translate(calc(${x}px - 50%), -50%) rotate(${reduzido ? 0 : rot}deg)`,
        // reduced-motion: 0ms = sem deslocamento/giro visível (troca de
        // posição instantânea); só a opacidade (pulso abaixo) marca a
        // mudança de estado.
        transitionDuration: reduzido ? '0ms' : `${DURACAO_MS}ms`,
        transitionTimingFunction: reduzido ? 'linear' : EASING,
      }}
    >
      <BolaSvg innerRef={svgRef} />
    </span>
  );
}
