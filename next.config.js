const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // A imagem da prévia do link (app/pelada/[id]/opengraph-image.js) lê as
    // fontes do disco em runtime. O rastreamento automático do Next não
    // enxerga esse readFile, então sem isso as fontes não vão pro deploy e
    // a rota daria 500 na Vercel (só aparece lá, não no build local).
    outputFileTracingIncludes: {
      '/pelada/[id]/opengraph-image': ['./assets/fonts/**/*'],
    },
  },
};

// withSentryConfig precisa envolver o config SEMPRE — é ele que injeta,
// via webpack, a importação de sentry.client.config.js no bundle do
// navegador. Sem isso, o SDK do lado servidor funciona normal (o
// instrumentation.js importa sentry.server.config.js direto, sem passar
// por aqui), mas o SDK do navegador nunca chega a rodar: Sentry.init()
// nunca é chamado no cliente, então nenhum erro de tela nem
// captureMessage do lado cliente é reportado.
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
