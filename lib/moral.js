// "Moral": substitui a média simples de estrelas como número de reputação
// principal mostrado pelo app. Pondera cinco sinais, cada um normalizado
// pra 0–1, e devolve um valor de 0 a 5 (mesma escala da nota, pra
// reaproveitar a UI de estrela existente).
//
// Pesos-base (documentados aqui pra poder ajustar depois sem precisar
// reler o código todo) — versão com check-in/pontualidade/fair play:
//   40% avaliação média recebida (nota/5) — direto do que os outros acharam.
//   30% proporção presença vs. falta — comparecer sem cancelar de última
//       hora (ou sem ser marcado ausente no encerramento) pesa mais que só
//       ter nota boa.
//   15% pontualidade.
//   10% fair play.
//   5% antiguidade da conta, capada em 12 meses — desempata levemente a
//      favor de quem já tem histórico na plataforma.
//
// Redistribuição de peso (o "sem queda brusca" pedido): pontualidade e
// fair play só existem enquanto sinal se a pessoa JÁ tem check-in/
// avaliação de fair play registrada. Quem não tem NENHUM dado numa dessas
// duas dimensões não paga um "imposto neutro" fixo — o peso dela some do
// total e é redistribuído proporcionalmente entre nota/presença/
// antiguidade (as três dimensões que sempre existem, mesmo pra quem nunca
// jogou). Resultado prático: quem ainda não fez nenhum check-in tem uma
// Moral praticamente idêntica à fórmula antiga (50/35/15), porque é
// exatamente o que sobra quando pontualidade e fair play saem da conta —
// só quando a pessoa já tem histórico numa dimensão nova é que ela passa a
// pesar de verdade. Enquanto isso, DENTRO de cada dimensão com pouco dado,
// suavização de Laplace ((acertos+1)/(total+2)) evita que os primeiros 1-2
// check-ins/avaliações balancem a nota pra um extremo.
//
// "falta" = confirmação aprovada que foi cancelada a menos de 3h do
// início (mesmo limiar de "em cima da hora" usado no resto do app) OU
// marcada presente=false no encerramento formal. Simplesmente não fazer
// check-in NUNCA vira falta — check-in é um sinal de presença, não uma
// obrigação (ver app/api/confirmacoes/[id]/checkin/route.js).
//
// Patente (lib/patentes.js) continua medindo só volume de partidas —
// "experiência" — e não entra aqui. Moral é "confiança", propositalmente
// uma dimensão separada; misturar as duas puniria patente por causa de
// poucos check-ins, o que não faz sentido.
//
// RF-005: quando alguém avalia especificamente a atuação como capitão
// (tipo='capitao'), essa nota pesa mais na moral do que uma avaliação
// comum de jogador — comandar bem é um sinal mais forte de reputação do
// que só jogar bem. Avaliação 'geral' (sobre a partida, não sobre uma
// pessoa) nunca entra nessa conta.
export const PESO_AVALIACAO_CAPITAO = 2;

const PESOS_BASE = { nota: 0.40, presenca: 0.30, pontualidade: 0.15, fairPlay: 0.10, antiguidade: 0.05 };

// Média ponderada de notas recebidas por uma pessoa, dando peso maior às
// avaliações tipo='capitao'. `avaliacoes` é uma lista de {nota, tipo}.
export function notaMediaPonderada(avaliacoes) {
  let soma = 0;
  let peso = 0;
  for (const a of avaliacoes || []) {
    const p = a.tipo === 'capitao' ? PESO_AVALIACAO_CAPITAO : 1;
    soma += a.nota * p;
    peso += p;
  }
  return peso > 0 ? soma / peso : null;
}

export function calcularMoral({
  notaMedia, presencas, faltas, contaCriadaEm,
  pontuais = 0, comCheckin = 0, fairPlaySim = 0, fairPlayTotal = 0,
}) {
  // sem avaliação nenhuma ainda, usa um neutro (2.5/5) em vez de penalizar
  const notaComponent = notaMedia != null ? notaMedia / 5 : 0.5;

  // suavização de Laplace: poucos dados puxam pra perto de 0.5 em vez de
  // virar 0% ou 100% de cara — mesmo princípio nos três componentes de
  // proporção.
  const presencaComponent = (presencas + 1) / (presencas + faltas + 2);
  const pontualidadeComponent = (pontuais + 1) / (comCheckin + 2);
  const fairPlayComponent = (fairPlaySim + 1) / (fairPlayTotal + 2);

  const mesesDeConta = contaCriadaEm
    ? (Date.now() - new Date(contaCriadaEm).getTime()) / (1000 * 60 * 60 * 24 * 30)
    : 0;
  const antiguidadeComponent = Math.min(1, mesesDeConta / 12);

  // Pesos efetivos: começam nos pesos-base; se pontualidade e/ou fair play
  // não têm NENHUM dado, o peso deles é zerado e devolvido pras três
  // dimensões sempre-disponíveis, proporcional ao peso que cada uma já
  // tem entre si.
  let { nota: wNota, presenca: wPresenca, pontualidade: wPontualidade, fairPlay: wFairPlay, antiguidade: wAntiguidade } = PESOS_BASE;
  let sobra = 0;
  if (comCheckin === 0) { sobra += wPontualidade; wPontualidade = 0; }
  if (fairPlayTotal === 0) { sobra += wFairPlay; wFairPlay = 0; }
  if (sobra > 0) {
    const baseSempreDisponivel = wNota + wPresenca + wAntiguidade;
    wNota += sobra * (wNota / baseSempreDisponivel);
    wPresenca += sobra * (wPresenca / baseSempreDisponivel);
    wAntiguidade += sobra * (wAntiguidade / baseSempreDisponivel);
  }

  const moral01 = wNota * notaComponent + wPresenca * presencaComponent + wPontualidade * pontualidadeComponent
    + wFairPlay * fairPlayComponent + wAntiguidade * antiguidadeComponent;
  return moral01 * 5;
}
