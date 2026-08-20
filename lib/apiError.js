import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Toda rota /api que falha de verdade (erro 500 — banco fora do ar, bug,
// serviço externo caindo) devolvia só um JSON de erro pro navegador e
// nunca mais deixava rastro nenhum: sem exceção lançada, o Sentry nunca
// via nada, e o único jeito de descobrir era vasculhar o log da Vercel na
// mão. Essa função substitui NextResponse.json({error}, {status}) nesses
// pontos — reporta pro Sentry antes de devolver a resposta de sempre.
// Erros 4xx (validação, permissão, "já existe") não são falha do sistema,
// só não passam por aqui.
export function errJson(error, status = 500) {
  const message = typeof error === 'string' ? error : (error?.message || 'Erro inesperado.');
  if (status >= 500) {
    Sentry.captureException(error instanceof Error ? error : new Error(message));
  }
  return NextResponse.json({ error: message }, { status });
}
