import { POSICAO_ZONA } from '@/lib/gameUtils';

// Divide os aprovados em dois times o mais equilibrado possível — olha
// posição (cada zona se espalha entre os dois times, não empilha todos os
// atacantes do mesmo lado) e moral (dentro de cada zona, do jogador mais
// bem avaliado pro menos, alternando o time que tá com menos gente até
// agora). Zona sem posição própria cai num balde "Sem posição" e entra no
// sorteio normalmente. Não é ciência de verdade, só um ponto de partida —
// o capitão ajusta manualmente depois.
export function balancearTimes(aprovados) {
  const porZona = new Map();
  for (const c of aprovados) {
    const zona = POSICAO_ZONA[c.posicoes?.[0]] || 'Sem posição';
    if (!porZona.has(zona)) porZona.set(zona, []);
    porZona.get(zona).push(c);
  }

  const atribuicoes = {};
  let contA = 0;
  let contB = 0;

  for (const jogadoresDaZona of porZona.values()) {
    const ordenados = [...jogadoresDaZona].sort((a, b) => (b.moral ?? 0) - (a.moral ?? 0));
    for (const jogador of ordenados) {
      const time = contA <= contB ? 'A' : 'B';
      atribuicoes[jogador.id] = time;
      if (time === 'A') contA++; else contB++;
    }
  }

  return atribuicoes;
}
