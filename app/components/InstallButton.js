'use client';
import { useState } from 'react';
import { useInstallPrompt } from '@/lib/installBanner';
import TicketButton from './TicketButton';
import IosShareIcon from './IosShareIcon';

// Botão fixo de instalar, independente do banner (que é dispensável e some
// pra sempre). Mesma detecção de plataforma do banner (useInstallPrompt),
// sem duplicar lógica — só a apresentação muda: aqui sempre confirma antes
// de disparar o prompt nativo, e no iPhone abre um passo a passo visual em
// vez de só uma linha de texto.
export default function InstallButton() {
  const { platform, canInstall, install } = useInstallPrompt();
  const [modo, setModo] = useState(null); // null | 'confirmar-android' | 'ios' | 'indisponivel'
  const [instalando, setInstalando] = useState(false);

  function handleClick() {
    if (platform === 'ios') { setModo('ios'); return; }
    if (platform === 'android' && canInstall) { setModo('confirmar-android'); return; }
    setModo('indisponivel');
  }

  async function handleConfirmarInstalar() {
    setInstalando(true);
    await install();
    setInstalando(false);
    setModo(null);
  }

  if (platform === 'installed') {
    return <p className="pl-hint" style={{ margin: 0 }}>✓ Já instalado</p>;
  }

  return (
    <>
      <button type="button" className="pl-btn-secondary" style={{ flex: 'none' }} onClick={handleClick}>
        Instalar app
      </button>

      {modo === 'confirmar-android' && (
        <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && setModo(null)}>
          <div className="pl-modal">
            <h3>Instalar o Peladeiros na tela inicial?</h3>
            <p>Fica com acesso rápido, igual um app de verdade.</p>
            <div className="pl-modal-actions">
              <button type="button" className="pl-btn-secondary" onClick={() => setModo(null)}>Cancelar</button>
              <TicketButton compact disabled={instalando} onClick={handleConfirmarInstalar}>
                {instalando ? 'Instalando...' : 'Instalar'}
              </TicketButton>
            </div>
          </div>
        </div>
      )}

      {modo === 'ios' && (
        <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && setModo(null)}>
          <div className="pl-modal" style={{ textAlign: 'center' }}>
            <IosShareIcon />
            <h3>Instala na tela de início</h3>
            <p>
              O iPhone não deixa instalar automaticamente — mas é rápido:
            </p>
            <p style={{ textAlign: 'left' }}>
              1. Toque no ícone de <b>Compartilhar</b> (o quadrado com a seta) na barra do Safari.<br />
              2. Role e toque em <b>&quot;Adicionar à Tela de Início&quot;</b>.<br />
              3. Toque em <b>Adicionar</b>.
            </p>
            <div className="pl-modal-actions">
              <button type="button" className="pl-btn-secondary" style={{ flex: 1 }} onClick={() => setModo(null)}>Entendi</button>
            </div>
          </div>
        </div>
      )}

      {modo === 'indisponivel' && (
        <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && setModo(null)}>
          <div className="pl-modal">
            <h3>Instalação não disponível aqui</h3>
            <p>Esse navegador não oferece instalação automática. Tenta pelo Chrome no Android ou pelo Safari no iPhone.</p>
            <div className="pl-modal-actions">
              <button type="button" className="pl-btn-secondary" style={{ flex: 1 }} onClick={() => setModo(null)}>Entendi</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
