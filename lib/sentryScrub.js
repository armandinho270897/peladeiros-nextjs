// Lista de campos que nunca podem sair do servidor em relatório de erro —
// dado pessoal (e-mail, telefone/WhatsApp, nome) e qualquer credencial
// (senha, token, chave de serviço). Usado pelo beforeSend nos 3 arquivos de
// init do Sentry (client/server/edge) — um único lugar pra manter a lista.
const CAMPOS_SENSIVEIS = [
  'email', 'e-mail', 'whatsapp', 'telefone', 'phone',
  'senha', 'password', 'nova_senha', 'confirmar_senha',
  'token', 'access_token', 'refresh_token', 'authorization', 'cookie',
  'apikey', 'api_key', 'service_role', 'service_role_key', 'anon_key', 'dsn',
];

function pareceSensivel(chave) {
  const k = chave.toLowerCase();
  return CAMPOS_SENSIVEIS.some((s) => k.includes(s));
}

// Percorre um objeto (corpo de request, extras, etc.) e troca o valor de
// qualquer chave sensível por "[removido]", recursivamente, sem mutar o
// original. Limita profundidade pra não travar em objetos circulares/imensos.
function limparObjeto(obj, profundidade = 0) {
  if (!obj || typeof obj !== 'object' || profundidade > 6) return obj;
  if (Array.isArray(obj)) return obj.map((v) => limparObjeto(v, profundidade + 1));

  const limpo = {};
  for (const [chave, valor] of Object.entries(obj)) {
    if (pareceSensivel(chave)) {
      limpo[chave] = '[removido]';
    } else if (valor && typeof valor === 'object') {
      limpo[chave] = limparObjeto(valor, profundidade + 1);
    } else {
      limpo[chave] = valor;
    }
  }
  return limpo;
}

// beforeSend comum aos 3 ambientes (client/server/edge): remove dado pessoal
// e credenciais antes do evento sair pro Sentry. Nunca usa setUser em
// nenhum lugar do app, mas remove event.user também por segurança em
// profundidade — se algum dia alguém adicionar setUser sem revisar isso,
// o dado pessoal ainda não vaza.
export function scrubEvent(event) {
  if (event.user) delete event.user;

  if (event.request) {
    if (event.request.cookies) delete event.request.cookies;
    if (event.request.headers) {
      const headers = {};
      for (const [k, v] of Object.entries(event.request.headers)) {
        headers[k] = pareceSensivel(k) ? '[removido]' : v;
      }
      event.request.headers = headers;
    }
    if (event.request.data) event.request.data = limparObjeto(event.request.data);
  }

  if (event.extra) event.extra = limparObjeto(event.extra);
  if (event.contexts) event.contexts = limparObjeto(event.contexts);

  return event;
}
