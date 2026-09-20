import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embaralhar, formarTimesCompletos } from '../lib/desafiadoSorteio.js';

const jogadores = (n) => Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, nome: `Jogador ${i}` }));

test('embaralhar mantém os mesmos elementos e não altera a lista original', () => {
  const original = [1, 2, 3, 4, 5];
  const resultado = embaralhar(original);
  assert.deepEqual(original, [1, 2, 3, 4, 5]);
  assert.deepEqual([...resultado].sort(), [1, 2, 3, 4, 5]);
});

test('embaralhar é uniforme: as 6 ordens de 3 itens saem com frequência parecida', () => {
  const contagem = new Map();
  const rodadas = 6000;
  for (let i = 0; i < rodadas; i++) {
    const chave = embaralhar(['a', 'b', 'c']).join('');
    contagem.set(chave, (contagem.get(chave) || 0) + 1);
  }
  assert.equal(contagem.size, 6);
  for (const n of contagem.values()) assert.ok(n > 800 && n < 1200, `frequência fora do esperado: ${n}`);
});

test('13 jogadores em times de 3 fazem 4 times completos e sobra 1', () => {
  const { times, sobra } = formarTimesCompletos(jogadores(13), 3);
  assert.equal(times.length, 4);
  assert.ok(times.every((t) => t.length === 3));
  assert.equal(sobra.length, 1);
});

test('nenhum jogador aparece duas vezes nem se perde', () => {
  const { times, sobra } = formarTimesCompletos(jogadores(17), 5);
  const ids = [...times.flat(), ...sobra].map((j) => j.id);
  assert.equal(ids.length, 17);
  assert.equal(new Set(ids).size, 17);
});

test('sem gente suficiente pra um time, todo mundo vira sobra', () => {
  const { times, sobra } = formarTimesCompletos(jogadores(4), 5);
  assert.equal(times.length, 0);
  assert.equal(sobra.length, 4);
});

test('número exato de jogadores não deixa sobra', () => {
  const { times, sobra } = formarTimesCompletos(jogadores(10), 5);
  assert.equal(times.length, 2);
  assert.equal(sobra.length, 0);
});
