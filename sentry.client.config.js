import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@/lib/sentryScrub';

// Roda no navegador — captura tela quebrando pro usuário (erro de render do
// React, exceção não tratada em qualquer código client-side).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});
