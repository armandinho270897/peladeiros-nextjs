import { inicioDoJogo } from '@/lib/gameUtils';

// Duração assumida do jogo — mesma suposição de ~2h já usada em
// app/api/confirmacoes/[id]/aprovar/route.js (JANELA_CONFLITO_MS) pra
// detectar conflito de horário entre duas peladas. Não existe campo de
// duração no banco, então os dois lugares reaproveitam o mesmo número.
const DURACAO_PADRAO_MS = 2 * 60 * 60 * 1000;

function formatUtcIcs(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Monta o título/local/descrição/horário do evento — usado tanto pro link
// do Google Agenda quanto pro arquivo .ics, pra garantir que os dois
// mostrem exatamente a mesma coisa.
function detalhesDoEvento(game) {
  const inicio = inicioDoJogo(game);
  const fim = new Date(inicio.getTime() + DURACAO_PADRAO_MS);

  const linhas = ['Você está confirmado nessa pelada.'];
  if (game.tipo) linhas.push(`Tipo: ${game.tipo}`);
  if (game.nivel) linhas.push(`Nível: ${game.nivel}`);
  if (game.valor != null) linhas.push(`Valor: R$ ${Number(game.valor).toFixed(2)} por pessoa`);
  if (game.regras) linhas.push(`Regras: ${game.regras}`);
  linhas.push('', `Detalhes da pelada: https://peladeiros-nextjs.vercel.app/pelada/${game.id}`);

  return {
    titulo: `Pelada — ${game.local}`,
    local: `${game.local}, ${game.bairro}`,
    descricao: linhas.join('\n'),
    inicio,
    fim,
  };
}

// Link que abre o Google Agenda já preenchido (sem precisar de conta
// Google nem de API paga — é só uma URL com o formulário de "criar
// evento" pré-populado via query string).
export function googleCalendarUrl(game) {
  const { titulo, local, descricao, inicio, fim } = detalhesDoEvento(game);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    dates: `${formatUtcIcs(inicio)}/${formatUtcIcs(fim)}`,
    details: descricao,
    location: local,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Escapa texto pro formato iCalendar (RFC 5545 §3.3.11) — vírgula, ponto e
// vírgula e barra invertida precisam de escape; quebra de linha vira \n
// literal (não quebra de linha de verdade, que o formato reserva pra
// "folding" de linha longa).
function escapeIcs(texto) {
  return String(texto).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

// RFC 5545 §3.1 exige quebrar linhas com mais de 75 octets — sem isso,
// alguns clientes (principalmente Outlook) truncam ou rejeitam a
// descrição. Cada linha continuada começa com um espaço. TextEncoder (em
// vez de Buffer) porque esse módulo é importado tanto do servidor
// (gerar o .ics) quanto do cliente (montar o link do Google Agenda) — sem
// depender de uma API só do Node.
const byteLength = (str) => new TextEncoder().encode(str).length;

function foldLine(linha) {
  if (byteLength(linha) <= 75) return linha;
  const partes = [];
  let atual = linha;
  while (byteLength(atual) > 75) {
    let corte = 75;
    while (byteLength(atual.slice(0, corte)) > 75) corte--;
    partes.push(atual.slice(0, corte));
    atual = ' ' + atual.slice(corte);
  }
  partes.push(atual);
  return partes.join('\r\n');
}

// Gera o conteúdo de um arquivo .ics válido (RFC 5545) — compatível com
// Google Agenda, Apple Calendar e Outlook sem depender de nenhum pacote
// externo, só string. UID estável (mesmo id sempre) faz um segundo
// download do mesmo evento ATUALIZAR o evento já importado em vez de criar
// duplicado, em quem o calendário suporta isso (Google/Apple/Outlook
// suportam).
export function buildIcsContent(game) {
  const { titulo, local, descricao, inicio, fim } = detalhesDoEvento(game);
  const agora = formatUtcIcs(new Date());

  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Peladeiros//Agenda da Pelada//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${game.id}@peladeiros-nextjs.vercel.app`,
    `DTSTAMP:${agora}`,
    `DTSTART:${formatUtcIcs(inicio)}`,
    `DTEND:${formatUtcIcs(fim)}`,
    `SUMMARY:${escapeIcs(titulo)}`,
    `DESCRIPTION:${escapeIcs(descricao)}`,
    `LOCATION:${escapeIcs(local)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return linhas.map(foldLine).join('\r\n') + '\r\n';
}
