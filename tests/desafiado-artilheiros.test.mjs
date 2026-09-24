import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularArtilheiros } from '../lib/desafiadoArtilheiros.js';

const JOGADORES = [
  { id: 'j1', nome: 'Ana' },
  { id: 'j2', nome: 'Beto' },
  { id: 'j3', nome: 'Caio' },
];

test('conta gols por jogador e ordena do maior pro menor', () => {
  const gols = [{ jogador_id: 'j2' }, { jogador_id: 'j1' }, { jogador_id: 'j2' }, { jogador_id: 'j2' }, { jogador_id: 'j1' }];
  const resultado = calcularArtilheiros(gols, JOGADORES);
  assert.deepEqual(resultado, [
    { jogadorId: 'j2', nome: 'Beto', gols: 3 },
    { jogadorId: 'j1', nome: 'Ana', gols: 2 },
  ]);
});

test('empate mantém a ordem de quem marcou primeiro', () => {
  const gols = [{ jogador_id: 'j3' }, { jogador_id: 'j1' }];
  const resultado = calcularArtilheiros(gols, JOGADORES);
  assert.deepEqual(resultado.map((a) => a.jogadorId), ['j3', 'j1']);
});

test('sem gol nenhum, lista vazia', () => {
  assert.deepEqual(calcularArtilheiros([], JOGADORES), []);
  assert.deepEqual(calcularArtilheiros(null, JOGADORES), []);
});

test('jogador que sumiu da lista ainda aparece, com nome genérico', () => {
  const resultado = calcularArtilheiros([{ jogador_id: 'fantasma' }], JOGADORES);
  assert.deepEqual(resultado, [{ jogadorId: 'fantasma', nome: 'Jogador', gols: 1 }]);
});
