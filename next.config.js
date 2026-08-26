const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {};

// withSentryConfig precisa envolver o config SEMPRE — é ele que injeta,
// via webpack, a importação de sentry.client.config.js no bundle do
// navegador. Sem isso, o SDK do lado servidor funciona normal (o
// instrumentation.js importa sentry.server.config.js direto, sem passar
// por aqui), mas o SDK do navegador nunca chega a rodar — Sentry.init()
// nunca é chamado no cliente, então nenhum erro de tela nem captureMessage
// do lado cliente sai do lugar (bug real encontrado: era exatamente isso
// que impedia até o diagnóstico temporário do sino de avisos de aparecer).
// Sourcemap (stack trace com código original, não minificado) é a única
// parte que de fato depende de SENTRY_AUTH_TOKEN — sem o token, o plugin
// só pula o upload e avisa no log do build; a integração continua ativa.
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
