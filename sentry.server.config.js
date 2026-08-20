import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@/lib/sentryScrub';

// Roda no servidor — captura erro não tratado nas rotas /api e nas páginas
// renderizadas no servidor. Erros que a rota já devolve como JSON (não
// lança exceção) são reportados manualmente via lib/apiError.js.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});
