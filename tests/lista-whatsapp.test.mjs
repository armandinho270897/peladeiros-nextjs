import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarListaWhatsapp } from '../lib/listaWhatsapp.js';

const base = {
  id: 'g1', local: 'Praça da roseira', data: '2026-09-30', horario: '20:00:00', tipo: 'Futsal',
  valor: 15, vagas_totais: 5, owner_id: 'u1', capitao: 'Ycaro', confirmacoes: [],
};
const c = (id, nome, status, posicoes) => ({ id, user_id: id, nome, status, posicoes });
const LINK = 'https://exemplo.com/pelada/g1';

test('cabeçalho com dia, horário sem segundos, tipo e valor em reais', () => {
  const txt = montarListaWhatsapp(base, LINK);
  assert.match(txt, /^⚽ \*PRAÇA DA ROSEIRA\*\nQUA 30 · 20:00 · Futsal · R\$ 15,00\n/);
});

test('sem valor e sem tipo, o cabeçalho não deixa separador sobrando', () => {
  const txt = montarListaWhatsapp({ ...base, valor: 0, tipo: null }, LINK);
  assert.match(txt, /\nQUA 30 · 20:00\n/);
});

test('capitão sempre primeiro, mesmo sem linha em confirmacoes, e marcado', () => {
  const txt = montarListaWhatsapp({ ...base, confirmacoes: [c('u2', 'Victor', 'aprovado')] }, LINK);
  assert.match(txt, /👟 \*Linha\*\n1\. Ycaro \(capitão\)\n2\. Victor\n/);
});

test('goleiros ficam numa seção própria e a numeração continua pela linha e banco', () => {
  const txt = montarListaWhatsapp({
    ...base,
    confirmacoes: [
      c('u1', 'Ycaro', 'aprovado'),
      c('u2', 'Marquinhos', 'aprovado', ['goleiro']),
      c('u3', 'Susiane', 'aprovado', ['zagueiro']),
      c('u4', 'Elber', 'espera'),
    ],
  }, LINK);
  assert.match(txt, /🧤 \*Goleiros\*\n1\. Marquinhos\n/);
  assert.match(txt, /👟 \*Linha\*\n2\. Ycaro \(capitão\)\n3\. Susiane\n/);
  assert.match(txt, /🪑 \*Banco\*\n4\. Elber\n/);
});

test('seções vazias não aparecem', () => {
  const txt = montarListaWhatsapp(base, LINK);
  assert.doesNotMatch(txt, /Goleiros|Banco/);
});

test('chamada final conta as vagas livres, com singular e lotada', () => {
  assert.match(montarListaWhatsapp(base, LINK), /Faltam 4 vagas\. Confirma aqui:\nhttps/);
  const quase = { ...base, confirmacoes: ['a', 'b', 'c'].map((id) => c(id, id, 'aprovado')) };
  assert.match(montarListaWhatsapp(quase, LINK), /Falta 1 vaga\. Confirma aqui:/);
  const lotada = { ...base, confirmacoes: ['a', 'b', 'c', 'd'].map((id) => c(id, id, 'aprovado')) };
  assert.match(montarListaWhatsapp(lotada, LINK), /Pelada lotada\. Entra no banco aqui:/);
});
