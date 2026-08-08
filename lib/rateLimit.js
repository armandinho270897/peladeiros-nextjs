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

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
