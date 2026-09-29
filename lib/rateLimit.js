// Rate limiter simples em memória. Válido enquanto rodar numa única instância de servidor;
// não é compartilhado entre processos/regiões, mas resolve o caso de uso atual sem serviço pago.
const buckets = new Map();

export function checkRateLimit(key, limit = 10, windowMs = 5 * 60 * 1000) {
  const now = Date.now();
  const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return true;
}

// x-vercel-forwarded-for é a fonte confiável pra isso na Vercel: o
// x-forwarded-for comum já vem sobrescrito por eles (não repassam IP externo,
// documentado como proteção contra spoofing), mas só enquanto não existir
// outro proxy/CDN na frente da Vercel — se um dia entrar um, é esse header
// que continua correto (docs: vercel.com/docs/headers/request-headers).
export function getClientIp(request) {
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) return vercelForwarded.split(',')[0].trim();
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
