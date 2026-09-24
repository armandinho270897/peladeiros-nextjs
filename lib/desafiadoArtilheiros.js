// Agrega os gols (linhas de desafiado_gols) por jogador e ordena do maior
// pro menor. Empate mantém a ordem de quem apareceu primeiro na lista de
// gols (Array.sort é estável desde sempre no Node/V8 atual) — não reordena
// por nome nem por acaso.
export function calcularArtilheiros(gols, jogadores) {
  const nomePorJogadorId = Object.fromEntries((jogadores || []).map((j) => [j.id, j.nome]));
  const contagem = new Map();
  for (const g of gols || []) contagem.set(g.jogador_id, (contagem.get(g.jogador_id) || 0) + 1);

  return [...contagem.entries()]
    .map(([jogadorId, golsMarcados]) => ({ jogadorId, nome: nomePorJogadorId[jogadorId] || 'Jogador', gols: golsMarcados }))
    .sort((a, b) => b.gols - a.gols);
}
