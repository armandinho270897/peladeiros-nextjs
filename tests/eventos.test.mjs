import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limparEvento } from '../lib/eventos.js';

const GAME = '92c64b42-f413-41cd-8cef-a7fbeed771d3';

test('evento válido passa só com os campos conhecidos', () => {
  const e = limparEvento({ nome: 'pelada_vista', path: `/pelada/${GAME}?ref=wa`, ref: 'wa', gameId: GAME, lixo: 'x' });
  assert.deepEqual(e, { nome: 'pelada_vista', path: `/pelada/${GAME}`, ref: 'wa', canal: null, game_id: GAME });
});

test('nome fora da lista derruba o evento', () => {
  assert.equal(limparEvento({ nome: 'qualquer_coisa' }), null);
  assert.equal(limparEvento({}), null);
  assert.equal(limparEvento(null), null);
  assert.equal(limparEvento('texto'), null);
});

test('campo opcional inválido vira null, mas o evento ainda conta', () => {
  const e = limparEvento({ nome: 'compartilhou', ref: 'Tem Espaço!', canal: 'x'.repeat(40), gameId: 'não-é-uuid', path: 'sem-barra' });
  assert.deepEqual(e, { nome: 'compartilhou', path: null, ref: null, canal: null, game_id: null });
});

test('query string é descartada do path e o tamanho é limitado', () => {
  assert.equal(limparEvento({ nome: 'conta_criada', path: '/completar-perfil?next=%2F&x=1' }).path, '/completar-perfil');
  assert.equal(limparEvento({ nome: 'conta_criada', path: '/' + 'a'.repeat(500) }).path.length, 200);
});

test('ref e canal só aceitam minúsculas, números, _ e -', () => {
  assert.equal(limparEvento({ nome: 'compartilhou', canal: 'lista' }).canal, 'lista');
  assert.equal(limparEvento({ nome: 'compartilhou', canal: 'wa_2' }).canal, 'wa_2');
  assert.equal(limparEvento({ nome: 'compartilhou', canal: "wa'; drop table" }).canal, null);
  assert.equal(limparEvento({ nome: 'compartilhou', canal: 123 }).canal, null);
});
