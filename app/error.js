'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import TicketButton from './components/TicketButton';

// Boundary de erro de uma página específica — o resto do app (nav, header)
// continua de pé. Reporta pro Sentry assim que o erro acontece, senão essa
// tela só existiria pro usuário, sem ninguém saber que rolou.
export default function Error({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--paper)', fontSize: 22 }}>
        Deu ruim por aqui
      </h2>
      <p style={{ color: 'var(--paper-dim)', fontSize: 14, lineHeight: 1.5 }}>
        Alguma coisa quebrou nessa tela. Já ficamos sabendo — tenta de novo.
      </p>
      <div style={{ marginTop: 20 }}>
        <TicketButton onClick={() => reset()}>Tentar de novo</TicketButton>
      </div>
    </div>
  );
}
