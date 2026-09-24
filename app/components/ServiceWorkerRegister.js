'use client';
import { useEffect } from 'react';

// Registra o service worker (public/sw.js). Sem componente visual, só o
// efeito colateral do registro — já roda depois do carregamento inicial
// porque useEffect só dispara depois do primeiro paint.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registro falhou (ex: navegador sem suporte de verdade) — o app
      // continua funcionando normal, só sem o offline mais bonito.
    });
  }, []);

  return null;
}
