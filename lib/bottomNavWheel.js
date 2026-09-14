// Ordem e rotas da navegação inferior — centralizado aqui pra BottomNav.js
// não reimplementar a conta em nenhum outro lugar.

// Ordem fixa dos 5 setores, sempre da esquerda pra direita nessa mesma
// sequência (barra estática, sem reordenar) — "criar" nunca é destino de
// rota, só ocupa a posição central da barra como ação. "organizar" não
// faz parte dela — é acessado pelo botão flutuante (OrganizarFab.js).
export const ORDEM_NAV = ['inicio', 'peladas', 'criar', 'avisos', 'perfil'];
export const TOTAL_ITENS = ORDEM_NAV.length;
export const INDICE_CRIAR = ORDEM_NAV.indexOf('criar');

export const ROTA_POR_INDICE = { 0: '/', 1: '/peladas', 3: '/avisos', 4: '/perfil' };

// pathname -> índice do setor ativo, ou null se a rota atual não
// corresponde a nenhum item de navegação (ex: /pelada/[id], /organizar)
// — nesse caso nenhuma aba fica marcada como ativa, mas o swipe ainda usa
// o último índice válido como referência de "onde eu estava".
export function indiceDaRota(pathname) {
  if (pathname === '/') return 0;
  if (pathname === '/peladas') return 1;
  if (pathname === '/avisos') return 3;
  if (pathname === '/perfil') return 4;
  return null;
}

// Próximo setor NAVEGÁVEL (pula "criar", que não é destino de rota) a
// partir do índice atual, na direção pedida (+1 = próxima aba à direita
// na ordem fixa, -1 = anterior). Usado pelo swipe.
export function proximoIndiceNavegavel(indiceAtual, direcao) {
  let i = indiceAtual;
  do {
    i = ((i + direcao) % TOTAL_ITENS + TOTAL_ITENS) % TOTAL_ITENS;
  } while (i === INDICE_CRIAR);
  return i;
}
