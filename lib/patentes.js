// Fonte única de verdade das patentes — id estável (não o nome de exibição)
// pra qualquer lugar que precise diferenciar por nível, como a aura por
// patente em HomeHero.js. Nome pode mudar por ajuste de copy sem quebrar
// nada que dependa do id.
export const PATENTES = [
  { id: 'gandula', min: 0, nome: 'Reserva de Gandula' },
  { id: 'cafeleite', min: 2, nome: 'Café com Leite' },
  { id: 'fraudinha', min: 5, nome: 'Fraudinha' },
  { id: 'classico', min: 10, nome: 'Peladeiro Clássico' },
  { id: 'firulamen', min: 30, nome: 'Firulamen' },
  { id: 'bradock', min: 70, nome: 'Bradock Peladeiros' },
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
