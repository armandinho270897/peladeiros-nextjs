import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertUsuarioAtivo } from '../lib/moderacao.js';

const DIA = 24 * 60 * 60 * 1000;

test('conta ativa ou advertida pode usar o app', () => {
  assert.equal(assertUsuarioAtivo({ status: 'ativo' }), null);
  assert.equal(assertUsuarioAtivo({ status: 'advertido' }), null);
});

test('conta bloqueada é barrada', () => {
  assert.match(assertUsuarioAtivo({ status: 'bloqueado' }), /bloqueada/);
});

test('suspensão dentro do prazo barra e informa a data', () => {
  const msg = assertUsuarioAtivo({ status: 'suspenso', suspenso_ate: new Date(Date.now() + 2 * DIA).toISOString() });
  assert.match(msg, /suspensa até/);
});

test('suspensão sem prazo definido continua barrando', () => {
  assert.match(assertUsuarioAtivo({ status: 'suspenso', suspenso_ate: null }), /suspensa/);
});

test('suspensão vencida libera a conta', () => {
  assert.equal(assertUsuarioAtivo({ status: 'suspenso', suspenso_ate: new Date(Date.now() - DIA).toISOString() }), null);
});

test('sem perfil não barra (a rota trata isso antes)', () => {
  assert.equal(assertUsuarioAtivo(null), null);
});
