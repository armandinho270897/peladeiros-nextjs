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
//
// `error` como objeto (erro cru do Postgres/PostgREST, ex: `errJson(error,
// 500)`) nunca vai pro navegador como texto — só pro Sentry. Passar assim
// vazava nome de coluna/constraint/schema em toda resposta 500 do app.
// `error` como string (mensagem já escrita à mão pro usuário, ex:
// `errJson('Não consegui enviar o e-mail.', 502)`) continua indo pro
// cliente do jeito que foi escrita — quem chamou já decidiu que é seguro
// mostrar.
export function errJson(error, status = 500) {
  const ehMensagemPronta = typeof error === 'string';
  const message = ehMensagemPronta ? error : (error?.message || 'Erro inesperado.');
  if (status >= 500) {
    Sentry.captureException(error instanceof Error ? error : new Error(message));
  }
  const mensagemCliente = !ehMensagemPronta && status >= 500 ? 'Algo deu errado no servidor. Tenta de novo em alguns instantes.' : message;
  return NextResponse.json({ error: mensagemCliente }, { status });
}
