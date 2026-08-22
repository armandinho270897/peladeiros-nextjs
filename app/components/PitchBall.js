'use client';
import { useState } from 'react';

// Bola parada no gramado atrás do cartão de login — toca e ela quica/gira.
// Puramente lúdica, mesma filosofia do easter egg do logo (Brand.js): não
// faz nada além de reagir ao toque. Sem requestAnimationFrame de propósito
// (fica suspenso em abas sem foco/visibilidade) — só estado + ciclo de vida
// normal da animação CSS.
export default function PitchBall() {
  const [kicked, setKicked] = useState(false);

  return (
    <button
      type="button"
      className={`pl-pitch-ball ${kicked ? 'pl-kicked' : ''}`}
      onClick={() => setKicked(true)}
      onAnimationEnd={() => setKicked(false)}
      aria-label="Bola"
    >
      ⚽
    </button>
  );
}
