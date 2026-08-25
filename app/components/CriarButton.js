'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// "expand" fica de pé o tempo inteiro da animação do anel (pl-ring-out,
// 420ms em globals.css) — se fosse mais curto que isso, a classe some e o
// anel corta pela metade em vez de terminar de desaparecer.
const STAGES_FULL = [['sink', 110], ['ball', 160], ['spin', 300], ['expand', 420]];
const STAGES_REDUCED = [['ball', 40], ['expand', 40]];

// "+" afunda -> vira bola -> gira -> expande -> abre criar pelada. A ação
// real (ir pra /?criar=1, ou disparar o evento quando já em "/") é a mesma
// de sempre — só passou a disparar no início do "expand" em vez de num
// <Link> instantâneo, pra acompanhar a animação sem atrasar a navegação.
export default function CriarButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [stage, setStage] = useState('idle');
  const timerRef = useRef(null);
  const runningRef = useRef(false);
  // BottomNav nunca desmonta — se a pessoa tocar noutro item da navegação
  // no meio da animação (~800ms), o pathname da hora do clique já não vale
  // mais nada quando o "expand" for decidir pra onde ir.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleClick() {
    // guarda em ref, não em state — dois cliques no mesmíssimo tick (ex:
    // toque duplo sintético) não esperam o re-render pra ver o estado novo.
    if (runningRef.current) return;
    runningRef.current = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stages = reduced ? STAGES_REDUCED : STAGES_FULL;
    let i = 0;
    function step() {
      if (i >= stages.length) { setStage('idle'); runningRef.current = false; return; }
      const [name, duration] = stages[i];
      setStage(name);
      if (name === 'expand') {
        if (pathnameRef.current === '/') window.dispatchEvent(new Event('pl:criar-pelada'));
        else router.push('/?criar=1');
      }
      timerRef.current = setTimeout(() => { i += 1; step(); }, duration);
    }
    step();
  }

  return (
    <button
      type="button"
      className={`pl-bottom-nav-central ${stage !== 'idle' ? stage : ''}`}
      onClick={handleClick}
      aria-label="Criar pelada"
    >
      <svg className="pl-central-icon-plus" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <svg className="pl-central-icon-ball" width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true" filter="url(#pl-rough-filter)">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.9" />
        <path d="M12 8.8L15.04 11.01 13.88 14.59 10.12 14.59 8.96 11.01Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 8.8V4M15.04 11.01L19.6 9.53M13.88 14.59L16.7 18.47M10.12 14.59L7.3 18.47M8.96 11.01L4.39 9.53" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </button>
  );
}
