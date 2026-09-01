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

// Escolhe uma imagem da lista de forma determinística a partir do id da
// pelada — mesmo id sempre cai na mesma imagem (fixo em qualquer tela,
// card ou detalhe), sem precisar gravar a escolha no banco. Hash simples
// (soma ponderada dos códigos de caractere, mod tamanho da lista) — não
// precisa ser criptográfico, só estável e bem distribuído o bastante pra
// não empilhar tudo numa imagem só.
export function imagemFixaPorId(id, lista) {
  if (!id || !lista?.length) return null;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return lista[hash % lista.length];
}
