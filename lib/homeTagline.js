const TAGLINES = [
  'Juntou a tropa. Tem jogo.',
  'Hoje tem?',
  'A bola tá esperando.',
  'Chamou a rapaziada?',
  'Só falta você.',
  'Hoje tem resenha.',
];

// Uma frase por dia (hash simples da data) — não muda a cada scroll/render,
// só quando o dia vira.
export function dailyTagline() {
  const day = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < day.length; i++) hash = (hash * 31 + day.charCodeAt(i)) | 0;
  return TAGLINES[Math.abs(hash) % TAGLINES.length];
}
