'use client';
import { useRef, useState } from 'react';

const TAPS_PARA_EASTER_EGG = 5;
const JANELA_MS = 1500;

// Wordmark "PELADEIROS" compartilhado por todas as telas que o exibem
// (antes duplicado inline em 7 lugares). Easter egg discreto: 5 toques
// seguidos disparam uma bola quicando — nada além disso, sem mudar o
// visual normal do logo.
export default function Brand({ style }) {
  const [egg, setEgg] = useState(false);
  const tapsRef = useRef([]);

  function handleTap() {
    const now = Date.now();
    tapsRef.current = [...tapsRef.current.filter((t) => now - t < JANELA_MS), now];
    if (tapsRef.current.length >= TAPS_PARA_EASTER_EGG) {
      tapsRef.current = [];
      setEgg(true);
      setTimeout(() => setEgg(false), 900);
    }
  }

  return (
    <div className="pl-brand" style={style} onClick={handleTap}>
      <div className="pl-brand-text">PELADEI<span>ROS</span></div>
      {egg && <span className="pl-easter-ball" aria-hidden="true">⚽</span>}
    </div>
  );
}
