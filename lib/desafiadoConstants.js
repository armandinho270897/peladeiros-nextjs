// Sugestão de tamanho de time por tipo de jogo — o capitão vê isso
// pré-preenchido num campo numérico editável, não é uma trava rígida
// (Society, por exemplo, varia de 5 a 9 na prática). Mesma lista de tipos
// já usada em TIPOS_JOGO (app/components/icons/TipoJogoIcon.js).
export const TAMANHO_TIME_SUGERIDO = {
  'Futebol de campo': 11,
  'Society': 6,
  'Futsal': 5,
  'Futebol de areia': 5,
  'Futebol de Rua': 3,
  'Outro': 5,
};

// Duração sugerida da partida (minutos) — também editável, varia bastante
// conforme o formato (rua costuma ser bem mais curto que campo).
export const DURACAO_SUGERIDA_MIN = {
  'Futebol de campo': 20,
  'Society': 15,
  'Futsal': 10,
  'Futebol de areia': 10,
  'Futebol de Rua': 7,
  'Outro': 10,
};
