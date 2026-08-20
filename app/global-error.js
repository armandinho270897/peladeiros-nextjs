'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import './globals.css';

// Último recurso — só entra em cena se o erro acontecer no próprio
// layout.js (raro). Substitui a página inteira, por isso precisa do próprio
// <html>/<body>; o app/error.js normal cobre o caso comum (erro dentro de
// uma tela) sem derrubar a navegação.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ background: 'var(--ink)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 420, padding: '0 20px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--paper)', fontSize: 22 }}>
            Deu ruim por aqui
          </h2>
          <p style={{ color: 'var(--paper-dim)', fontSize: 14, lineHeight: 1.5 }}>
            O app quebrou de um jeito mais sério. Já ficamos sabendo — tenta recarregar a página.
          </p>
          <button
            onClick={() => reset()}
            style={{ marginTop: 20, background: 'var(--neon)', color: 'var(--ink)', border: 'none', padding: '10px 20px', fontFamily: 'var(--font-display)', textTransform: 'uppercase', borderRadius: 6, cursor: 'pointer' }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
