import { fmtDate, fmtHora, confirmadosDe, esperaDe, aguardandoConfirmacaoDe, POSICAO_ZONA } from './gameUtils.js';

// Texto no formato que todo organizador já monta na mão pra colar no grupo
// do WhatsApp: numeração corrida (goleiros, linha, banco), seção só aparece
// se tiver gente, e o link pra confirmar no final. *negrito* é a sintaxe do
// próprio WhatsApp.
function ehGoleiro(c) {
  return POSICAO_ZONA[c.posicoes?.[0]] === 'Goleiro';
}

function reais(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

export function montarListaWhatsapp(game, link) {
  const d = fmtDate(game.data);
  const confirmados = confirmadosDe(game);
  const goleiros = confirmados.filter(ehGoleiro);
  const linha = confirmados.filter((c) => !ehGoleiro(c));
  const banco = esperaDe(game);
  // Conta pelos nomes que aparecem na própria lista (capitão incluso, mesmo
  // sem linha em confirmacoes) pra o texto nunca dizer "faltam 5" com 1 nome
  // já escrito — ocupandoVagaDe não enxerga o capitão sintetizado.
  const restantes = Math.max(0, game.vagas_totais - confirmados.length - aguardandoConfirmacaoDe(game).length);

  let n = 0;
  const nome = (c) => `${++n}. ${c.nome}${game.owner_id && c.user_id === game.owner_id ? ' (capitão)' : ''}`;

  const cabecalho = [`${d.dow} ${d.dom}`, fmtHora(game.horario), game.tipo, game.valor > 0 ? reais(game.valor) : null]
    .filter(Boolean)
    .join(' · ');

  const blocos = [`⚽ *${game.local.toUpperCase()}*\n${cabecalho}`];
  if (goleiros.length) blocos.push(`🧤 *Goleiros*\n${goleiros.map(nome).join('\n')}`);
  if (linha.length) blocos.push(`👟 *Linha*\n${linha.map(nome).join('\n')}`);
  if (banco.length) blocos.push(`🪑 *Banco*\n${banco.map(nome).join('\n')}`);

  const chamada = restantes === 0
    ? 'Pelada lotada. Entra no banco aqui:'
    : `${restantes === 1 ? 'Falta 1 vaga' : `Faltam ${restantes} vagas`}. Confirma aqui:`;
  blocos.push(`${chamada}\n${link}`);

  return blocos.join('\n\n');
}
