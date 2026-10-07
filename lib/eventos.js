// Medição própria do funil (tabela `eventos`, migration aplicada à mão) —
// deliberadamente pequena: 4 eventos, todos anônimos. A rota
// (app/api/eventos) e os testes usam essa mesma validação, então o que o
// navegador pode gravar fica restrito ao que está listado aqui.
export const EVENTOS_VALIDOS = ['pelada_vista', 'compartilhou', 'confirmou_presenca', 'conta_criada'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOKEN_RE = /^[a-z0-9_-]{1,20}$/;

function token(valor) {
  return typeof valor === 'string' && TOKEN_RE.test(valor) ? valor : null;
}

// Devolve só campos conhecidos e já saneados, ou null se o evento não vale.
// Campo opcional inválido vira null (o evento ainda conta); só o nome do
// evento inválido derruba tudo.
export function limparEvento(body) {
  if (!body || typeof body !== 'object') return null;
  if (!EVENTOS_VALIDOS.includes(body.nome)) return null;

  const path = typeof body.path === 'string' && body.path.startsWith('/') ? body.path.split('?')[0].slice(0, 200) : null;
  return {
    nome: body.nome,
    path,
    ref: token(body.ref),
    canal: token(body.canal),
    game_id: typeof body.gameId === 'string' && UUID_RE.test(body.gameId) ? body.gameId : null,
  };
}
