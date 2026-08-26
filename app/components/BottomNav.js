'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import NotificationBell from './NotificationBell';
import QuadraIcon from './QuadraIcon';
import PeladasBallIcon from './PeladasBallIcon';
import ShieldIcon from './ShieldIcon';
import CriarButton from './CriarButton';
import { tapFlash } from '@/lib/tapFlash';

// "A Quadra Viva" — navegação inferior fixa (mobile). Atalhos pro que já
// existe hoje: Início (recorte curado), Peladas (navegação completa em
// /peladas), criar pelada, avisos (mesmo sino do header, painel abrindo
// pra cima) e perfil. Só o visual/interação mudou (Bloco 2) — rotas,
// páginas e lógica de cada destino continuam as mesmas de sempre.
export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav className="pl-bottom-nav" aria-label="Navegação principal">
      {/* filtro compartilhado que dá o traço levemente torto/stencil pros
          ícones de Peladas e da bola central — definido uma vez só aqui,
          já que BottomNav nunca desmonta entre navegações. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="pl-rough-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.3" />
        </filter>
      </svg>

      <Link href="/" className={`pl-bottom-nav-item ${pathname === '/' ? 'active' : ''}`} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon">
          <span className="pl-bottom-nav-splat" aria-hidden="true" />
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <QuadraIcon />
        </span>
        Início
      </Link>

      <Link href="/peladas" className={`pl-bottom-nav-item ${pathname === '/peladas' ? 'active' : ''}`} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon">
          <span className="pl-bottom-nav-splat" aria-hidden="true" />
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <PeladasBallIcon />
        </span>
        Peladas
      </Link>

      <CriarButton />

      <NotificationBell variant="bottomnav" />

      <Link href="/perfil" className={`pl-bottom-nav-item ${pathname === '/perfil' ? 'active' : ''}`} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon">
          <span className="pl-bottom-nav-splat" aria-hidden="true" />
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <ShieldIcon />
        </span>
        Perfil
      </Link>
    </nav>
  );
}
