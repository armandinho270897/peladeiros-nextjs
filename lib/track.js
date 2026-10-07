'use client';

// Rastreador do funil (ver lib/eventos.js e app/api/eventos). Tudo aqui é
// "melhor esforço": envolto em try/catch, nunca lança e nunca espera
// resposta — medir não pode, em hipótese nenhuma, atrapalhar o app.
const CHAVE_REF = 'pl-ref';

function ler(chave) {
  try { return sessionStorage.getItem(chave); } catch { return null; }
}
function gravar(chave, valor) {
  try { sessionStorage.setItem(chave, valor); } catch {}
}

// Origem do link (?ref=wa, ?ref=lista...) — guarda a PRIMEIRA da sessão, pra
// a visita, a conta criada e a confirmação do mesmo convidado caírem na mesma
// origem mesmo que ele navegue antes de agir.
export function capturarRef() {
  try {
    if (ler(CHAVE_REF)) return;
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && /^[a-z0-9_-]{1,20}$/.test(ref)) gravar(CHAVE_REF, ref);
  } catch {}
}

export function track(nome, extra = {}) {
  try {
    if (typeof window === 'undefined') return;
    const corpo = JSON.stringify({ nome, path: window.location.pathname, ref: ler(CHAVE_REF), ...extra });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/eventos', new Blob([corpo], { type: 'application/json' }));
    } else {
      fetch('/api/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(() => {});
    }
  } catch {}
}

// Uma vez por sessão — recarregar a página ou voltar nela não infla a
// contagem de "pessoas que viram a pelada".
export function trackUmaVez(chave, nome, extra) {
  const marca = `pl-ev-${chave}`;
  if (ler(marca)) return;
  gravar(marca, '1');
  track(nome, extra);
}
