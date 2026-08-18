'use client';
import { useEffect, useState } from 'react';
import { isInstallBannerDismissed, dismissInstallBanner, useInstallPrompt } from '@/lib/installBanner';

// Banner discreto de instalação — some pra sempre depois de dispensado
// (localStorage) e nunca aparece se o app já estiver rodando instalado.
// Android/Chrome usa o beforeinstallprompt nativo (botão real de
// instalar); iPhone/Safari não expõe esse evento, então cai em instrução
// por texto (não tem outro jeito na plataforma).
export default function InstallBanner() {
  const { platform, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isInstallBannerDismissed());
  }, []);

  function handleDismiss() {
    setDismissed(true);
    dismissInstallBanner();
  }

  async function handleInstall() {
    await install();
    dismissInstallBanner();
    setDismissed(true);
  }

  if (dismissed || !platform || platform === 'installed') return null;

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
