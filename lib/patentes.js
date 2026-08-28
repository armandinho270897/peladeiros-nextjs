// Fonte única de verdade das patentes — id estável (não o nome de exibição)
// pra qualquer lugar que precise diferenciar por nível, como a aura por
// patente em HomeHero.js. Nome pode mudar por ajuste de copy sem quebrar
// nada que dependa do id.
export const PATENTES = [
  { id: 'novato', min: 0, nome: 'Novato de Quadra' },
  { id: 'cria', min: 1, nome: 'Cria da Rua' },
  { id: 'estrela', min: 20, nome: 'Estrela do Bairro' },
  { id: 'referencia', min: 50, nome: 'Referência da Quadra' },
  { id: 'lenda', min: 100, nome: 'Lenda do Bairro' },
];

export function patenteDe(peladasJogadas, capitao) {
  let idx = 0;
  for (let i = 0; i < PATENTES.length; i++) if (peladasJogadas >= PATENTES[i].min) idx = i;
  const atual = PATENTES[idx];
  const proxima = PATENTES[idx + 1] || null;
  return {
    id: atual.id,
    nome: atual.nome,
    capitao,
    proximaPatente: proxima ? { nome: proxima.nome, atual: peladasJogadas, meta: proxima.min } : null,
  };
}
