'use client';
import { useState, useEffect } from 'react';
import { isOnboardingSeen, markOnboardingSeen } from '@/lib/onboarding';
import NightPitchBackground from './NightPitchBackground';
import Brand from './Brand';
import OnboardingDescobrirIcon from './OnboardingDescobrirIcon';
import OnboardingConfirmarIcon from './OnboardingConfirmarIcon';
import OnboardingAvaliarIcon from './OnboardingAvaliarIcon';
import TicketButton from './TicketButton';

const PASSOS = [
  { Icon: OnboardingDescobrirIcon, titulo: 'Ache uma pelada perto de você', texto: 'Veja as peladas rolando no seu bairro, com horário, vagas e quem já vai.' },
  { Icon: OnboardingConfirmarIcon, titulo: 'Confirme presença em 1 toque', texto: 'Peça pra entrar, o capitão aprova e pronto — sua vaga garantida.' },
  { Icon: OnboardingAvaliarIcon, titulo: 'Jogue, avalie, suba de moral', texto: 'Depois da partida, avalia a galera e constrói sua reputação no futebol de várzea.' },
];

// Só aparece na primeira visita (localStorage) — nunca mais depois de
// visto ou pulado. Mora fora do AuthProvider de propósito: apresenta o
// app antes de qualquer login, não depende de sessão.
export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isOnboardingSeen()) setVisible(true);
  }, []);

  function vibrar() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
  }

  function finish() {
    markOnboardingSeen();
    setVisible(false);
  }

  function next() {
    vibrar();
    if (step < PASSOS.length - 1) setStep((s) => s + 1);
    else finish();
  }

  if (!visible) return null;

  const { Icon, titulo, texto } = PASSOS[step];
  const palavras = titulo.split(' ');

  return (
    <div className="pl-onboarding-overlay">
      <NightPitchBackground />
      <div className="pl-onb-glow" />
      <div className="pl-onb-grain" />
      <Brand style={{ position: 'absolute', top: 22, left: 20, zIndex: 2, opacity: 0.7, transform: 'scale(0.62)', transformOrigin: 'left top' }} />
      <button type="button" className="pl-onboarding-skip" onClick={finish}>Pular</button>
      {/* key={step} força remontar o bloco a cada passo — é isso que
          faz as animações de entrada (traço do ícone, título, texto)
          tocarem de novo toda vez, sem precisar controlar reset à mão. */}
      <div className="pl-onboarding-content" key={step}>
        <div className="pl-onb-icon-wrap"><Icon width={122} /></div>
        <h2>
          <span className="pl-sr-only">{titulo}</span>
          <span aria-hidden="true" className="pl-onb-title">
            {palavras.map((p, i) => (
              <span key={i} style={{ animationDelay: `${80 + i * 50}ms` }}>{p}&nbsp;</span>
            ))}
          </span>
        </h2>
        <p>{texto}</p>
      </div>
      <div className="pl-onboarding-dots">
        {PASSOS.map((_, i) => <span key={i} className={i === step ? 'active' : ''} />)}
      </div>
      <div className="pl-onboarding-actions">
        <TicketButton className="pl-onb-cta" onClick={next}>{step < PASSOS.length - 1 ? 'Próximo' : 'Vamos jogar'}</TicketButton>
      </div>
    </div>
  );
}
