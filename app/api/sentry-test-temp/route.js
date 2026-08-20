// Rota temporária só pra confirmar que o monitoramento de erro (Sentry)
// está entregando de verdade em produção — não fica no app depois do teste,
// remover assim que confirmar que o alerta chegou.
export async function GET() {
  throw new Error('Teste de monitoramento Sentry — Peladeiros. Se você está vendo isso no Sentry, funcionou.');
}
