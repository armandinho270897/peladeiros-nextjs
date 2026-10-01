import webpush from 'web-push';

// Sem as chaves configuradas (ambiente local antes de preencher .env.local,
// ou produção antes do primeiro deploy com elas), fica desligado de propósito
// em vez de quebrar a notificação in-app/e-mail que já funcionava — push é
// um canal a mais, nunca pode virar o motivo de uma ação principal falhar.
const configurado = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (configurado) {
  webpush.setVapidDetails(
    'mailto:armandofurtado3@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

export const pushConfigurado = configurado;

// Mesma lição aprendida com o rate limiter (lib/rateLimit.js): quem chama
// isso (createNotification, em cada ação do app — chat, confirmação,
// desafio...) espera a resposta antes de responder o HTTP da rota, então um
// serviço de push que trava sem responder travaria a ação principal junto.
// O pacote web-push aceita "timeout" nativo (vira timeout de socket do
// https.request) — sem ele, uma entrega lenta ou um host que não responde
// pode ficar pendurada por muito mais tempo que isso.
const TIMEOUT_MS = 3000;

// 404/410 = o navegador cancelou a assinatura (desinstalou, limpou dados,
// trocou de conta) e o serviço de push nunca mais vai aceitar esse
// endpoint — quem chama deve apagar a linha de push_subscriptions nesse
// caso, não só ignorar o erro.
export async function enviarPush(subscription, payload) {
  if (!configurado) return { ok: false, expirada: false };
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload),
      { timeout: TIMEOUT_MS },
    );
    return { ok: true, expirada: false };
  } catch (err) {
    const expirada = err.statusCode === 404 || err.statusCode === 410;
    return { ok: false, expirada, err };
  }
}
