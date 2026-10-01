import { supabaseAdmin } from './supabaseAdmin';
import * as Sentry from '@sentry/nextjs';

// Antes era um Map em memória — cada instância serverless da Vercel tem a
// sua própria, sem nada em comum entre elas. Nada garante que duas
// requisições seguidas do mesmo IP caem na mesma instância, então o
// limite real virava "N por instância", não "N no total" — uma brecha
// achada na auditoria. Agora usa uma função no Postgres (check_rate_limit,
// migration 067) com uma tabela compartilhada por todas as instâncias.
//
// Falha ABERTA de propósito: se a chamada em si der erro (banco fora do
// ar, rede lenta), deixa passar em vez de bloquear todo mundo — na pior
// hipótese volta a se comportar como se não tivesse rate limit nenhum,
// nunca trava o app por causa disso. O erro vai pro Sentry pra não ficar
// invisível enquanto isso.
//
// Timeout curto (1.5s) é essencial aqui — testado ao vivo com o Supabase
// genuinamente inacessível (DNS que não resolve) e, sem isso, o fetch
// demorava ~11s pra desistir sozinho antes de cair na falha aberta. Um
// rate limit "seguro" que deixa toda ação do app travada por 11s quando o
// banco engasga é pior do que não ter rate limit nenhum.
const TIMEOUT_MS = 1500;

export async function checkRateLimit(key, limit = 10, windowMs = 5 * 60 * 1000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const { data, error } = await supabaseAdmin
      .rpc('check_rate_limit', {
        p_key: key,
        p_limit: limit,
        p_window_seconds: Math.max(1, Math.round(windowMs / 1000)),
      })
      .abortSignal(controller.signal);
    if (error) throw error;
    return data === true;
  } catch (err) {
    Sentry.captureException(err instanceof Error ? err : new Error(`check_rate_limit falhou pra "${key}": ${err}`));
    return true;
  } finally {
    clearTimeout(timeout);
  }
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
