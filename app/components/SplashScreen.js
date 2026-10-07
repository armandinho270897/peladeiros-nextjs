'use client';
import { useEffect, useState } from 'react';

const PIXEL_TRANSPARENTE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const DURATION_MS = 1800;
const EXIT_MS = 500;

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(dismiss, DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setExiting((already) => {
      if (already) return already;
      setTimeout(() => setVisible(false), EXIT_MS);
      return true;
    });
  }

  if (!visible) return null;

  // Só o app instalado (display-mode: standalone) mostra a abertura — o CSS
  // (.pl-splash em base.css) esconde no navegador, onde cai quem chega por
  // link de WhatsApp. Antes eram 2,4 MB e ~2,3 s de tela cheia na frente da
  // pelada. O <picture> escolhe a imagem pela MESMA condição: instalado →
  // WebP de 116 KB (PNG de reserva pra navegador sem WebP); navegador → o
  // pixel transparente embutido, sem nenhuma requisição. Preferi isso a
  // loading="lazy": não depende do navegador decidir quando carregar.
  return (
    <div className={`pl-splash ${exiting ? 'pl-splash-exit' : ''}`} onClick={dismiss}>
      <picture>
        <source media="(display-mode: standalone)" srcSet="/splash.webp" type="image/webp" />
        <source media="(display-mode: standalone)" srcSet="/splash.png" />
        <img src={PIXEL_TRANSPARENTE} alt="Peladeiros" className="pl-splash-bg" />
      </picture>
      <div className="pl-splash-frame" aria-hidden="true" />
    </div>
  );
}
