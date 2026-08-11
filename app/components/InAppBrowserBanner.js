'use client';
import { useEffect, useState } from 'react';
import { isInAppBrowser } from '@/lib/inAppBrowser';

export default function InAppBrowserBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setShow(isInAppBrowser(navigator.userAgent));
  }, []);

  if (!show || dismissed) return null;

  return (
    <div className="pl-inapp-banner">
      <span>
        Pra sua conta ficar salva direitinho, abre esse link no navegador (toque em <b>⋯</b> e escolha <b>&quot;Abrir no navegador&quot;</b>).
      </span>
      <button type="button" aria-label="Fechar aviso" onClick={() => setDismissed(true)}>×</button>
    </div>
  );
}
