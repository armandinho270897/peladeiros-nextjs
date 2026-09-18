// Fisher-Yates — embaralhamento uniforme de verdade, sem peso por nível
// nenhum. É "sorteio", não "balanceamento" (isso já existe separado em
// lib/balancearTimes.js, usado por MontarTimesModal — propositalmente
// diferente).
export function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Divide jogadores (já embaralhados ou não — embaralha aqui) em times
// completos de `tamanhoTime`. Quem não fecha um time fica de fora, em
// `sobra` — vira lista de espera até juntar gente suficiente pra outro time
// (ver POST /api/desafiado/[id]/jogadores).
export function formarTimesCompletos(jogadores, tamanhoTime) {
  const embaralhados = embaralhar(jogadores);
  const times = [];
  let i = 0;
  while (i + tamanhoTime <= embaralhados.length) {
    times.push(embaralhados.slice(i, i + tamanhoTime));
    i += tamanhoTime;
  }
  return { times, sobra: embaralhados.slice(i) };
}
