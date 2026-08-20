const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {};

// Sourcemap (stack trace com o código original, não minificado) exige um
// token de autenticação à parte do DSN (SENTRY_AUTH_TOKEN) — sem ele, o
// plugin do Sentry pula o upload e o build segue normal; os erros continuam
// chegando certinho, só com número de linha do código minificado.
module.exports = process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;
