import { useEffect, useState } from 'react';

const KEY = 'peladeiros:instalar-dispensado';

export function isInstallBannerDismissed() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstallBanner() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // localStorage indisponível — segue sem persistir
  }
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se identifica como Mac no user-agent, mas tem touch — um Mac de verdade não tem.
  const iPadOS13 = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS13;
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// Detecta a plataforma e captura o prompt nativo de instalação
// (Android/Chrome) — usado tanto pelo banner quanto pelo botão dedicado
// de instalar, pra não duplicar a lógica de detecção em dois lugares.
export function useInstallPrompt() {
  const [platform, setPlatform] = useState(null); // null | 'android' | 'ios' | 'installed'
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (isStandalone()) {
      setPlatform('installed');
      return;
    }
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

  async function install() {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome === 'accepted';
  }

  return { platform, install, canInstall: !!deferredPrompt };
}
