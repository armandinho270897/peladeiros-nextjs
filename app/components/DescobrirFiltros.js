'use client';
import TipoJogoIcon, { TIPOS_JOGO } from './TipoJogoIcon';
import { NIVEL_OPCOES } from '@/lib/gameUtils';

const PRECO_OPCOES = [
  { valor: '0', label: 'Grátis' },
  { valor: '20', label: 'Até R$20' },
  { valor: '50', label: 'Até R$50' },
];

const VAGAS_OPCOES = [
  { valor: 'comVagas', label: 'Com vagas' },
  { valor: 'ultimasVagas', label: 'Últimas vagas' },
  { valor: 'espera', label: 'Lista de espera' },
];

const ORDENAR_OPCOES = [
  { valor: '', label: 'Começa primeiro' },
  { valor: 'recomendadas', label: 'Recomendadas' },
  { valor: 'perto', label: 'Mais perto' },
  { valor: 'vagas', label: 'Mais vagas' },
  { valor: 'preco', label: 'Menor preço' },
];

// Rótulo de cada filtro ativo, pro resumo compacto acima da lista — só
// entra aqui quem realmente mudou do padrão (raio/localização ficam de
// fora: são tratados à parte pelo chip "Perto" já existente).
export function resumoFiltrosAtivos(filtros, bairros) {
  const resumo = [];
  if (filtros.bairro) resumo.push({ chave: 'bairro', label: filtros.bairro });
  if (filtros.data === 'hoje') resumo.push({ chave: 'data', label: 'Hoje' });
  else if (filtros.data === 'amanha') resumo.push({ chave: 'data', label: 'Amanhã' });
  else if (filtros.data === 'fimDeSemana') resumo.push({ chave: 'data', label: 'Fim de semana' });
  else if (filtros.data) resumo.push({ chave: 'data', label: filtros.data.split('-').reverse().join('/') });
  if (filtros.periodo) resumo.push({ chave: 'periodo', label: { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }[filtros.periodo] });
  if (filtros.tipo) resumo.push({ chave: 'tipo', label: filtros.tipo });
  if (filtros.nivel) resumo.push({ chave: 'nivel', label: filtros.nivel });
  if (filtros.precoMax !== '') {
    const opc = PRECO_OPCOES.find((p) => p.valor === filtros.precoMax);
    resumo.push({ chave: 'precoMax', label: opc?.label || `Até R$${filtros.precoMax}` });
  }
  if (filtros.vagas) resumo.push({ chave: 'vagas', label: VAGAS_OPCOES.find((v) => v.valor === filtros.vagas)?.label });
  if (filtros.somenteTimes) resumo.push({ chave: 'somenteTimes', label: 'Só times' });
  return resumo;
}

// Painel de filtros da Descoberta — controlado 100% pelo objeto `filtros` +
// `onChange` do pai (app/peladas/page.js), pra caber no mesmo padrão de
// "um state só, persistido inteiro" já usado ali. Bairros/somenteTimes só
// aparecem se fizer sentido (somenteTimes só quando existe pelo menos um
// desafio de verdade no resultado atual — evita mostrar um filtro que
// nunca vai retornar nada).
export default function DescobrirFiltros({ filtros, onChange, bairros }) {
  // Forma funcional (onChange recebe uma função, não o objeto pronto) —
  // sem isso, dois cliques em campos diferentes na mesma janela de render
  // (ex.: toques rápidos em dois chips seguidos) cada um partia do mesmo
  // `filtros` "velho" via closure, e o segundo onChange sobrescrevia o
  // primeiro por inteiro, perdendo a escolha anterior. Com uma função, o
  // setFiltros do pai (app/peladas/page.js) aplica os dois em cima do
  // estado mais atual, na ordem certa, não importa quão rápido cliquem.
  function set(campo, valor) {
    onChange((prev) => ({ ...prev, [campo]: valor }));
  }
  function toggle(campo, valor) {
    onChange((prev) => ({ ...prev, [campo]: prev[campo] === valor ? '' : valor }));
  }

  return (
    <div className="pl-filters-panel-outer">
      <div className="pl-filters-panel" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="pl-field" style={{ margin: 0, minWidth: 140 }}>
          <label>Bairro</label>
          <select className="pl-select" style={{ width: '100%' }} value={filtros.bairro} onChange={(e) => set('bairro', e.target.value)}>
            <option value="">Todos os bairros</option>
            {bairros.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="pl-field" style={{ margin: 0, minWidth: 140 }}>
          <label>Escolher data</label>
          <input
            type="date"
            value={/^\d{4}-\d{2}-\d{2}$/.test(filtros.data) ? filtros.data : ''}
            onChange={(e) => set('data', e.target.value)}
          />
        </div>

        <div className="pl-field" style={{ margin: 0, minWidth: 140 }}>
          <label>Ordenar por</label>
          <select className="pl-select" style={{ width: '100%' }} value={filtros.ordenar} onChange={(e) => set('ordenar', e.target.value)}>
            {ORDENAR_OPCOES.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
          </select>
        </div>

        <div className="pl-field" style={{ margin: 0, width: '100%' }}>
          <label>Período</label>
          <div className="pl-tipo-jogo-chips">
            {['manha', 'tarde', 'noite'].map((p) => (
              <button key={p} type="button" className={`pl-chip ${filtros.periodo === p ? 'active' : ''}`} onClick={() => toggle('periodo', p)}>
                {{ manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="pl-field" style={{ margin: 0, width: '100%' }}>
          <label>Modalidade</label>
          <div className="pl-tipo-jogo-chips">
            {TIPOS_JOGO.map((t) => (
              <button key={t} type="button" className={`pl-chip pl-tipo-jogo-chip ${filtros.tipo === t ? 'active' : ''}`} onClick={() => toggle('tipo', t)}>
                <TipoJogoIcon tipo={t} size={14} /> {t}
              </button>
            ))}
          </div>
        </div>

        <div className="pl-field" style={{ margin: 0, width: '100%' }}>
          <label>Nível</label>
          <div className="pl-tipo-jogo-chips">
            {NIVEL_OPCOES.map((n) => (
              <button key={n} type="button" className={`pl-chip ${filtros.nivel === n ? 'active' : ''}`} onClick={() => toggle('nivel', n)}>{n}</button>
            ))}
          </div>
        </div>

        <div className="pl-field" style={{ margin: 0, width: '100%' }}>
          <label>Preço</label>
          <div className="pl-tipo-jogo-chips">
            {PRECO_OPCOES.map((p) => (
              <button key={p.valor} type="button" className={`pl-chip ${filtros.precoMax === p.valor ? 'active' : ''}`} onClick={() => set('precoMax', filtros.precoMax === p.valor ? '' : p.valor)}>{p.label}</button>
            ))}
          </div>
        </div>

        <div className="pl-field" style={{ margin: 0, width: '100%' }}>
          <label>Vagas</label>
          <div className="pl-tipo-jogo-chips">
            {VAGAS_OPCOES.map((v) => (
              <button key={v.valor} type="button" className={`pl-chip ${filtros.vagas === v.valor ? 'active' : ''}`} onClick={() => toggle('vagas', v.valor)}>{v.label}</button>
            ))}
            <button type="button" className={`pl-chip ${filtros.somenteTimes ? 'active' : ''}`} onClick={() => set('somenteTimes', !filtros.somenteTimes)}>Só peladas de times</button>
          </div>
        </div>
      </div>
    </div>
  );
}
