// Geometria e regras do carrossel da navegação inferior — tudo
// centralizado aqui (ordem dos itens, passos de distância/escala/
// opacidade, duração/easing) pra ajustar em um lugar só. BottomNav.js só
// consome essas funções, não reimplementa a conta em nenhum outro lugar.

// Ordem circular fixa dos 5 setores — "criar" nunca é destino de rota
// (nunca é o centro "de verdade"), mas ocupa um lugar na roda como
// qualquer outro, girando junto quando os vizinhos mudam. "organizar"
// saiu da roda — agora é acessado pelo botão flutuante (OrganizarFab.js),
// não é mais uma aba do carrossel.
export const ORDEM_NAV = ['inicio', 'peladas', 'criar', 'avisos', 'perfil'];
export const TOTAL_ITENS = ORDEM_NAV.length;
export const INDICE_CRIAR = ORDEM_NAV.indexOf('criar');

export const ROTA_POR_INDICE = { 0: '/', 1: '/peladas', 3: '/avisos', 4: '/perfil' };

// pathname -> índice do setor ativo, ou null se a rota atual não
// corresponde a nenhum item de navegação (ex: /pelada/[id], /organizar)
// — nesse caso BottomNav.js mantém o último centro válido (não reseta a
// roda à toa) e nenhuma aba fica marcada como ativa.
export function indiceDaRota(pathname) {
  if (pathname === '/') return 0;
  if (pathname === '/peladas') return 1;
  if (pathname === '/avisos') return 3;
  if (pathname === '/perfil') return 4;
  return null;
}

// Duração/easing do motion — 300ms (dentro dos 280-340ms pedidos), curva
// com desaceleração suave e overshoot mínimo (quase imperceptível, só o
// bastante pra não parecer robótico). ATENÇÃO: esses valores também estão
// hardcoded como literais em globals.css (.pl-nav-slot) — CSS não lê
// constante de JS, então os dois lados precisam ser mantidos em sincronia
// manualmente se algum dia mudar.
export const DURACAO_MS = 300;
export const EASING = 'cubic-bezier(0.30, 1.04, 0.34, 1)';

// Geometria por |offset| (0=centro, 1=vizinho imediato, 2=mais distante —
// com 5 itens, offset 2 é o máximo possível dos dois lados, simétrico).
// BASE/PASSO são FRAÇÕES da largura útil real da barra (medida em
// BottomNav.js via ResizeObserver, não um valor fixo em px) — é isso que
// faz a geometria respeitar o viewport de verdade em vez de vazar/apertar
// em telas estreitas (320px) ou ficar frouxa demais em telas largas
// (412px). Sem rotação (tiltDeg foi removido): só translate/scale/opacity,
// pra não parecer um efeito de carrossel chamativo — um componente nativo
// não gira ícone ao deslizar.
const BASE_FRACTION = 0.145;
const PASSO_FRACTION = 0.13;
const CURVA_Y = 2.2;
const OFFSET_MAX = 2;
// Largura de referência usada até a primeira medição real (ver
// LARGURA_PADRAO em BottomNav.js) — mantém os offsets antigos em px como
// documentação do valor "de repouso" esperado pra uma tela ~375px.
export const LARGURA_PADRAO = 355;

// Hierarquia: centro em contraste máximo; vizinho imediato visível e
// clicável com escala/contraste um pouco menores; o mais distante fica
// discreto mas nunca com cara de "desabilitado" (por isso a opacidade
// mínima não desce de ~0.5).
const ESCALA = { 0: 1, 1: 0.86, 2: 0.66 };
const OPACIDADE = { 0: 1, 1: 0.86, 2: 0.54 };

// offset "cru" (0..4) de um índice lógico em relação ao centro atual, sem
// escolher lado — só a distância circular direta.
function offsetCru(indiceLogico, centro) {
  return ((indiceLogico - centro) % TOTAL_ITENS + TOTAL_ITENS) % TOTAL_ITENS;
}

// Versão "canônica" do offset cru: em vez de 0..4 (sempre pro lado
// direito), reparte em metade negativa/metade positiva ao redor do centro
// (-2..2, pra 5 itens) — é o arranjo natural de uma roda em repouso, com
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
// (raw é sempre 0..4), amontoados e vazando pra fora da barra.
export function offsetMaisProximo(indiceLogico, centro, anterior) {
  const raw = offsetCru(indiceLogico, centro);
  const candidatos = [raw - TOTAL_ITENS, raw, raw + TOTAL_ITENS];
  const base = anterior ?? offsetCanonico(raw);
  return candidatos.reduce((melhor, c) => (Math.abs(c - base) < Math.abs(melhor - base) ? c : melhor));
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// offset -> transform/opacity do slot. `larguraUtil` é a largura real
// medida da área interna da barra (clientWidth do <nav>, a MESMA caixa que
// o CSS "left:50%" do .pl-nav-slot usa como referência) — é a partir dela,
// não de uma largura total "chutada" ou dividida por fora, que a distância
// em px de cada passo é calculada. |offset| pode passar de OFFSET_MAX
// transitoriamente durante uma rotação de caminho mais curto (ver
// offsetMaisProximo) — grampeia a APARÊNCIA (escala/opacidade) em
// OFFSET_MAX sem grampear a POSIÇÃO X, pra o item continuar deslizando
// suavemente por baixo do próximo mesmo depois de "sair de cena".
export function geometriaDoOffset(offset, larguraUtil = LARGURA_PADRAO) {
  const abs = Math.abs(offset);
  const passo = clamp(Math.round(abs), 0, OFFSET_MAX);
  const sinal = Math.sign(offset);
  const base = BASE_FRACTION * larguraUtil;
  const step = PASSO_FRACTION * larguraUtil;
  const x = abs === 0 ? 0 : sinal * (base + (abs - 1) * step);
  return {
    x,
    y: CURVA_Y * Math.min(abs, OFFSET_MAX),
    scale: ESCALA[passo],
    opacity: OPACIDADE[passo],
    zIndex: 10 - Math.round(Math.min(abs, OFFSET_MAX + 1)),
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
