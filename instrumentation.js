// Ponto de entrada que o próprio Next.js chama uma vez, na subida do
// servidor — carrega a config do Sentry certa pro ambiente (Node normal
// das rotas /api, ou Edge do middleware.js).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
