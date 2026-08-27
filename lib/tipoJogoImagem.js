// Mapa tipo de jogo -> ilustração em public/imagens_jogos/. "Outro" e
// qualquer tipo não mapeado caem no fallback (sem imagem, ver GameArtBanner).
export const TIPO_IMAGEM = {
  'Futebol de campo': '/imagens_jogos/campo.jpg',
  Society: '/imagens_jogos/society.jpg',
  Futsal: '/imagens_jogos/quadra.jpg',
  'Futebol de areia': '/imagens_jogos/praia.jpg',
  'Futebol de Rua': '/imagens_jogos/rua.jpg',
};

export function imagemDoTipo(tipo) {
  return TIPO_IMAGEM[tipo] || null;
}
