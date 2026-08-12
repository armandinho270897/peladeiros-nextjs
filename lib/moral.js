// "Moral": substitui a média simples de estrelas como número de reputação
// principal mostrado pelo app. Pondera três sinais, cada um normalizado
// pra 0–1, e devolve um valor de 0 a 5 (mesma escala da nota, pra
// reaproveitar a UI de estrela existente).
//
// Pesos (documentados aqui pra poder ajustar depois sem precisar reler o
// código todo):
//   50% avaliação média recebida (nota/5) — direto do que os outros acharam.
//   35% proporção presença vs. falta — comparecer sem cancelar de última
//       hora pesa mais que só ter nota boa.
//   15% antiguidade da conta, capada em 12 meses — desempata levemente a
//       favor de quem já tem histórico na plataforma.
//
// "falta" = confirmação aprovada que foi cancelada a menos de 3h do
// início (mesmo limiar de "em cima da hora" usado no resto do app).
// "presença" = confirmação aprovada numa pelada que já passou sem ter
// sido cancelada. Sem check-in físico, essa é a única distinção que os
// dados hoje permitem: quem nunca cancelou é tratado como presente.
export function calcularMoral({ notaMedia, presencas, faltas, contaCriadaEm }) {
  // sem avaliação nenhuma ainda, usa um neutro (2.5/5) em vez de penalizar
  const notaComponent = notaMedia != null ? notaMedia / 5 : 0.5;

  // suavização de Laplace: conta nova (0 presenças, 0 faltas) começa em
  // 0.5 (neutro) em vez de 0 (que seria injusto com quem nunca jogou)
  const presencaComponent = (presencas + 1) / (presencas + faltas + 2);

  const mesesDeConta = contaCriadaEm
    ? (Date.now() - new Date(contaCriadaEm).getTime()) / (1000 * 60 * 60 * 24 * 30)
    : 0;
  const antiguidadeComponent = Math.min(1, mesesDeConta / 12);

  const moral01 = 0.5 * notaComponent + 0.35 * presencaComponent + 0.15 * antiguidadeComponent;
  return moral01 * 5;
}
