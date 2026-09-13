// Geometria e regras do carrossel da navegação inferior — tudo
// centralizado aqui (ordem dos itens, passos de distância/escala/
// opacidade, duração/easing) pra ajustar em um lugar só. BottomNav.js só
// consome essas funções, não reimplementa a conta em nenhum outro lugar.

// Ordem circular fixa dos 6 setores — "criar" nunca é destino de rota
// (nunca é o centro "de verdade"), mas ocupa um lugar na roda como
// qualquer outro, girando junto quando os vizinhos mudam.
export const ORDEM_NAV = ['inicio', 'peladas', 'criar', 'avisos', 'perfil', 'organizar'];
export const TOTAL_ITENS = ORDEM_NAV.length;
export const INDICE_CRIAR = ORDEM_NAV.indexOf('criar');

export const ROTA_POR_INDICE = { 0: '/', 1: '/peladas', 3: '/avisos', 4: '/perfil', 5: '/organizar' };

// pathname -> índice do setor ativo, ou null se a rota atual não
// corresponde a nenhum item de navegação (ex: /pelada/[id]) — nesse caso
// BottomNav.js mantém o último centro válido (não reseta a roda à toa).
export function indiceDaRota(pathname) {
  if (pathname === '/') return 0;
  if (pathname === '/peladas') return 1;
  if (pathname === '/avisos') return 3;
  if (pathname === '/perfil') return 4;
  if (pathname.startsWith('/organizar')) return 5;
  return null;
}

// Duração/easing do motion — 320ms (dentro dos 260-380ms pedidos), curva
// com desaceleração elegante e um micro-overshoot sutil embutido na
// própria curva (sem precisar de keyframes extra pra "assentar").
export const DURACAO_MS = 320;
export const EASING = 'cubic-bezier(0.22, 1.12, 0.36, 1)';

// Geometria por |offset| (0=centro, 1=vizinho imediato, 2/3=mais
// distantes — com 6 itens, o offset 3 é sempre o único item "oposto" no
// círculo). BASE = distância até o primeiro vizinho; PASSO = incremento
// por posição adicional. Curva elíptica sutil via curvaY (nada de
// perspectiva 3D pesada) e uma leve inclinação (tiltDeg) por passo pra dar
// sensação de roda sem exagerar.
const BASE_X = 50;
const PASSO_X = 42;
const CURVA_Y = 3.4;
const TILT_DEG = 5.5;

const ESCALA = { 0: 1, 1: 0.8, 2: 0.62, 3: 0.48 };
const OPACIDADE = { 0: 1, 1: 0.78, 2: 0.5, 3: 0.24 };

// offset "cru" (0..5) de um índice lógico em relação ao centro atual, sem
// escolher lado — só a distância circular direta.
function offsetCru(indiceLogico, centro) {
  return ((indiceLogico - centro) % TOTAL_ITENS + TOTAL_ITENS) % TOTAL_ITENS;
}

// Versão "canônica" do offset cru: em vez de 0..5 (sempre pro lado
// direito), reparte em metade negativa/metade positiva ao redor do centro
// (-2..3, pra 6 itens) — é o arranjo natural de uma roda em repouso, com
// itens dos dois lados. Usada só como base inicial (ver abaixo); depois da
// primeira renderização, offsetMaisProximo já usa o offset anterior real.
function offsetCanonico(raw) {
  return raw > TOTAL_ITENS / 2 ? raw - TOTAL_ITENS : raw;
}

// Escolhe, entre as três voltas possíveis (uma a menos, a mesma, uma a
// mais que TOTAL_ITENS), a que fica mais perto do offset que esse item
// tinha ANTES da troca — é isso que faz o giro inteiro (todo mundo, não
// só o item tocado) sempre escolher o caminho mais curto a partir de onde
// já estava, em vez de sempre normalizar pro mesmo intervalo fixo (que
// causaria saltos abruptos exatamente no item que precisasse "dar a volta
// por trás" da roda). Sem offset anterior (primeira renderização), usa o
// canônico como base — senão TODOS os itens nasceriam do lado direito
// (raw é sempre 0..5), amontoados e vazando pra fora da barra.
export function offsetMaisProximo(indiceLogico, centro, anterior) {
  const raw = offsetCru(indiceLogico, centro);
  const candidatos = [raw - TOTAL_ITENS, raw, raw + TOTAL_ITENS];
  const base = anterior ?? offsetCanonico(raw);
  return candidatos.reduce((melhor, c) => (Math.abs(c - base) < Math.abs(melhor - base) ? c : melhor));
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// offset -> transform/opacity do slot. |offset| pode passar de 3
// transitoriamente durante uma rotação de caminho mais curto (ver
// offsetMaisProximo) — grampeia a APARÊNCIA (escala/opacidade) em 3 sem
// grampear a POSIÇÃO X, pra o item continuar deslizando suavemente por
// baixo do próximo mesmo depois de "sair de cena".
export function geometriaDoOffset(offset) {
  const abs = Math.abs(offset);
  const passo = clamp(Math.round(abs), 0, 3);
  const sinal = Math.sign(offset);
  const x = abs === 0 ? 0 : sinal * (BASE_X + (abs - 1) * PASSO_X);
  return {
    x,
    y: CURVA_Y * Math.min(abs, 3),
    scale: ESCALA[passo],
    opacity: OPACIDADE[passo],
    tilt: sinal * TILT_DEG * Math.min(abs, 3) / 3,
    zIndex: 10 - Math.round(Math.min(abs, 4)),
  };
}

// Próximo setor NAVEGÁVEL (pula "criar", que não é destino de rota) a
// partir do centro atual, na direção pedida (+1 = próximo à direita da
// ordem lógica, -1 = anterior). Usado pelo swipe.
export function proximoIndiceNavegavel(centro, direcao) {
  let i = centro;
  do {
    i = ((i + direcao) % TOTAL_ITENS + TOTAL_ITENS) % TOTAL_ITENS;
  } while (i === INDICE_CRIAR);
  return i;
}
