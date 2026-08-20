import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@/lib/sentryScrub';

// Roda no middleware.js (autenticação de rota) — ambiente Edge, à parte do
// server.config normal.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});
