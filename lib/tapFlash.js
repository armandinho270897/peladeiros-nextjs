// Dispara uma classe CSS de animação por um tempo e some sozinha — sempre
// um disparo só, nunca fica presa ligada (mesmo princípio do PitchBall.js:
// estado + ciclo de vida normal da animação CSS, sem requestAnimationFrame).
export function flashClass(el, className, duration) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), duration);
}

// Flash de toque de 220ms nos itens da navegação inferior.
export function tapFlash(e) {
  flashClass(e.currentTarget, 'flash', 220);
}
