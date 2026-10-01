'use client';

// Helpers de push pro navegador — tudo que roda do lado do cliente pra
// assinar/cancelar. O service worker (public/sw.js) é quem efetivamente
// mostra a notificação quando ela chega; isso aqui só gerencia a assinatura.

export function pushSuportado() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

// PushManager.subscribe() exige a chave VAPID em Uint8Array, não na string
// base64url que o .env guarda — essa é a conversão padrão pra isso.
function chaveParaUint8Array(chaveBase64) {
  const padding = '='.repeat((4 - (chaveBase64.length % 4)) % 4);
  const base64 = (chaveBase64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function statusPush() {
  if (!pushSuportado()) return 'indisponivel';
  if (Notification.permission === 'denied') return 'negado';
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? 'ativo' : 'inativo';
}

export async function assinarPush() {
  if (!pushSuportado()) throw new Error('Esse navegador não suporta notificação push.');

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') throw new Error('Você precisa permitir notificação pra ativar.');

  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!chavePublica) throw new Error('Push não configurado nesse ambiente.');

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: chaveParaUint8Array(chavePublica),
    });
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  if (!res.ok) throw new Error('Não deu pra salvar sua assinatura. Tenta de novo.');

  return subscription;
}

export async function cancelarPush() {
  if (!pushSuportado()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {});
}
