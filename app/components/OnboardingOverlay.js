'use client';
import { useState, useEffect } from 'react';
import { isOnboardingSeen, markOnboardingSeen } from '@/lib/onboarding';
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

  function finish() {
    markOnboardingSeen();
    setVisible(false);
  }

  function next() {
    if (step < PASSOS.length - 1) setStep((s) => s + 1);
    else finish();
  }

  if (!visible) return null;

  const { Icon, titulo, texto } = PASSOS[step];

  return (
    <div className="pl-onboarding-overlay">
      <button type="button" className="pl-onboarding-skip" onClick={finish}>Pular</button>
      <div className="pl-onboarding-content">
        <Icon width={170} />
        <h2>{titulo}</h2>
        <p>{texto}</p>
      </div>
      <div className="pl-onboarding-dots">
        {PASSOS.map((_, i) => <span key={i} className={i === step ? 'active' : ''} />)}
      </div>
      <div className="pl-onboarding-actions">
        <TicketButton onClick={next}>{step < PASSOS.length - 1 ? 'Próximo' : 'Vamos jogar'}</TicketButton>
      </div>
    </div>
  );
}
