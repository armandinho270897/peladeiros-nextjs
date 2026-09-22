import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayISO, mesAtualISO, inicioDoJogo, LIMITE_EM_CIMA_DA_HORA_MS } from '../lib/gameUtils.js';

// 23h de 30/09 em Brasília já é 01/10 em UTC (onde o servidor roda). Passa
// a data direto pra função em vez de mockar o relógio global — mais
// portável entre versões do Node do que node:test's mock.timers.
const VIRADA_DE_MES_UTC = new Date('2026-10-01T02:00:00Z');

test('todayISO usa o dia de Brasília, não o de UTC', () => {
  assert.equal(todayISO(VIRADA_DE_MES_UTC), '2026-09-30');
});

test('mesAtualISO não vira o mês antes da meia-noite de Brasília', () => {
  assert.equal(mesAtualISO(VIRADA_DE_MES_UTC), '2026-09-01');
});

test('mesAtualISO vira o mês à meia-noite de Brasília', () => {
  assert.equal(mesAtualISO(new Date('2026-10-01T03:00:00Z')), '2026-10-01');
});

test('inicioDoJogo interpreta data e horário como horário de Brasília', () => {
  const inicio = inicioDoJogo({ data: '2026-09-20', horario: '20:00:00' });
  assert.equal(inicio.toISOString(), '2026-09-20T23:00:00.000Z');
});

// Regra de falta: cancelou com menos de 3h antes do início.
function contaComoFalta(jogo, canceladoEmISO) {
  const diff = inicioDoJogo(jogo).getTime() - new Date(canceladoEmISO).getTime();
  return diff >= 0 && diff < LIMITE_EM_CIMA_DA_HORA_MS;
}

test('cancelar 2h antes do jogo conta como falta', () => {
  // jogo 20h Brasília; cancelou 18h Brasília = 21h UTC
  assert.equal(contaComoFalta({ data: '2026-09-20', horario: '20:00:00' }, '2026-09-20T21:00:00Z'), true);
});

test('cancelar 4h30 antes do jogo não conta como falta', () => {
  // cancelou 15h30 Brasília = 18h30 UTC
  assert.equal(contaComoFalta({ data: '2026-09-20', horario: '20:00:00' }, '2026-09-20T18:30:00Z'), false);
});

test('cancelar depois do início não conta como falta por cancelamento tardio', () => {
  assert.equal(contaComoFalta({ data: '2026-09-20', horario: '20:00:00' }, '2026-09-21T00:00:00Z'), false);
});
