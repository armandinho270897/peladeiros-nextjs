'use client';
import { useEffect, useState } from 'react';
import { isInstallBannerDismissed, dismissInstallBanner } from '@/lib/installBanner';

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se identifica como Mac no user-agent, mas tem touch — um Mac de verdade não tem.
  const iPadOS13 = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS13;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// Banner discreto de instalação — some pra sempre depois de dispensado
// (localStorage) e nunca aparece se o app já estiver rodando instalado.
// Android/Chrome usa o beforeinstallprompt nativo (botão real de
// instalar); iPhone/Safari não expõe esse evento, então cai em instrução
// por texto (não tem outro jeito na plataforma).
export default function InstallBanner() {
  const [platform, setPlatform] = useState(null); // null | 'android' | 'ios'
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (isStandalone() || isInstallBannerDismissed()) return;

    if (isIOS()) {
      setPlatform('ios');
      return;
    }

    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('android');
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  function handleDismiss() {
    setPlatform(null);
    dismissInstallBanner();
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setPlatform(null);
    dismissInstallBanner();
  }

  if (!platform) return null;

  return (
    <div className="pl-install-banner">
      {platform === 'ios' ? (
        <span>
          Instala o Peladeiros na tela de início: toque em <b>Compartilhar</b> e depois em <b>&quot;Adicionar à Tela de Início&quot;</b>.
        </span>
      ) : (
        <>
          <span>Instala o Peladeiros no seu celular pra acessar mais rápido.</span>
          <button type="button" className="pl-install-banner-btn" onClick={handleInstall}>Instalar app</button>
        </>
      )}
      <button type="button" aria-label="Fechar aviso" onClick={handleDismiss}>×</button>
    </div>
  );
}
