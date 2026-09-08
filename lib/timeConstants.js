// Opções compartilhadas pelo formulário de criar/editar time.
export const DIAS_SEMANA = [
  { value: 'segunda', label: 'Segunda' },
  { value: 'terca', label: 'Terça' },
  { value: 'quarta', label: 'Quarta' },
  { value: 'quinta', label: 'Quinta' },
  { value: 'sexta', label: 'Sexta' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
];

export const DIA_SEMANA_LABEL = Object.fromEntries(DIAS_SEMANA.map((d) => [d.value, d.label]));

export const RECRUTAMENTO_OPCOES = [
  { value: 'fechado', label: 'Fechado (só por convite)' },
  { value: 'procurando_jogadores', label: 'Procurando jogadores' },
  { value: 'procurando_goleiro', label: 'Procurando goleiro' },
];

export const NIVEL_COMPETITIVO_OPCOES = [
  { value: 'resenha', label: 'Resenha' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'competitivo', label: 'Competitivo' },
];

export const NIVEL_COMPETITIVO_LABEL = Object.fromEntries(NIVEL_COMPETITIVO_OPCOES.map((n) => [n.value, n.label]));

export const FAIXA_ETARIA_OPCOES = [
  { value: '18-25', label: '18-25 anos' },
  { value: '26-35', label: '26-35 anos' },
  { value: '36+', label: '36+ anos' },
  { value: 'livre', label: 'Livre (qualquer idade)' },
];

export const FAIXA_ETARIA_LABEL = Object.fromEntries(FAIXA_ETARIA_OPCOES.map((f) => [f.value, f.label]));

// Cores prontas pro seletor de uniforme — cobre as cores de camisa mais
// comuns no futebol amador, mais um "custom" via <input type="color">.
export const CORES_UNIFORME = [
  '#F3F3EE', '#161412', '#E8362B', '#2D6FE8', '#A6FF00',
  '#FFC53D', '#B87FE8', '#1B7A3D', '#F58220', '#6E7178',
];
