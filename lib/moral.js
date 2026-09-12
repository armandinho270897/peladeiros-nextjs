// "Moral": substitui a média simples de estrelas como número de reputação
// principal mostrado pelo app. Pondera cinco sinais, cada um normalizado
// pra 0–1, e devolve um valor de 0 a 5 (mesma escala da nota, pra
// reaproveitar a UI de estrela existente).
//
// Pesos (documentados aqui pra poder ajustar depois sem precisar reler o
// código todo) — versão com check-in/pontualidade/fair play:
//   40% avaliação média recebida (nota/5) — direto do que os outros acharam.
//   30% proporção presença vs. falta — comparecer sem cancelar de última
//       hora (ou sem ser marcado ausente no encerramento) pesa mais que só
//       ter nota boa.
//   15% pontualidade — só entra com peso de verdade pra quem já tem
//       check-in registrado (ver suavização abaixo).
//   10% fair play — idem, só pesa de verdade pra quem já tem avaliação de
//       fair play recebida.
//   5% antiguidade da conta, capada em 12 meses — desempata levemente a
//      favor de quem já tem histórico na plataforma.
//
// Patente (lib/patentes.js) continua medindo só volume de partidas —
// "experiência" — e não entra aqui. Moral é "confiança", propositalmente
// uma dimensão separada; misturar as duas puniria patente por causa de
// poucos check-ins, o que não faz sentido (patente é sobre já ter jogado
// bastante, não sobre pontualidade).
//
// "falta" = confirmação aprovada que foi cancelada a menos de 3h do
// início (mesmo limiar de "em cima da hora" usado no resto do app) OU
// marcada presente=false no encerramento formal. Simplesmente não fazer
// check-in NUNCA vira falta — check-in é um sinal de presença, não uma
// obrigação (ver app/api/confirmacoes/[id]/checkin/route.js).
// RF-005: quando alguém avalia especificamente a atuação como capitão
// (tipo='capitao'), essa nota pesa mais na moral do que uma avaliação
// comum de jogador — comandar bem é um sinal mais forte de reputação do
// que só jogar bem. Avaliação 'geral' (sobre a partida, não sobre uma
// pessoa) nunca entra nessa conta.
export const PESO_AVALIACAO_CAPITAO = 2;

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

  // suavização de Laplace em TODOS os componentes de proporção — conta sem
  // dado nenhum (0/0) começa exatamente em 0.5 (neutro), e poucos dados
  // puxam pra perto de 0.5 em vez de virar 0% ou 100% de cara. Mesmo
  // princípio pros quatro: presença, pontualidade e fair play. Pontualidade
  // e fair play ficarem neutros por padrão é literalmente o "fica neutro,
  // não prejudicado" pedido — ninguém perde moral por não ter check-in ou
  // avaliação de fair play ainda, só deixa de ganhar o que ganharia se
  // tivesse um histórico bom nessas duas dimensões.
  const presencaComponent = (presencas + 1) / (presencas + faltas + 2);
  const pontualidadeComponent = (pontuais + 1) / (comCheckin + 2);
  const fairPlayComponent = (fairPlaySim + 1) / (fairPlayTotal + 2);

  const mesesDeConta = contaCriadaEm
    ? (Date.now() - new Date(contaCriadaEm).getTime()) / (1000 * 60 * 60 * 24 * 30)
    : 0;
  const antiguidadeComponent = Math.min(1, mesesDeConta / 12);

  const moral01 = 0.40 * notaComponent + 0.30 * presencaComponent + 0.15 * pontualidadeComponent
    + 0.10 * fairPlayComponent + 0.05 * antiguidadeComponent;
  return moral01 * 5;
}
