'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import NotificationBell from './NotificationBell';
import QuadraIcon from './QuadraIcon';
import PeladasBallIcon from './PeladasBallIcon';
import ShieldIcon from './ShieldIcon';
import OrganizarIcon from './OrganizarIcon';
import CriarButton from './CriarButton';
import BottomNavBall from './BottomNavBall';
import { tapFlash } from '@/lib/tapFlash';

// "A Quadra Viva" — navegação inferior fixa (mobile). Atalhos pro que já
// existe hoje: Início (recorte curado), Peladas (navegação completa em
// /peladas), criar pelada, avisos (mesmo sino do header, painel abrindo
// pra cima) e perfil. Só o visual/interação mudou — rotas, páginas e
// lógica de cada destino continuam as mesmas de sempre.
export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const emInicio = pathname === '/';
  const emPeladas = pathname === '/peladas';
  const emPerfil = pathname === '/perfil';
  const emOrganizar = pathname.startsWith('/organizar');

  return (
    <nav className="pl-bottom-nav" aria-label="Navegação principal">
      <Link href="/" className={`pl-bottom-nav-item ${emInicio ? 'active' : ''}`} aria-current={emInicio ? 'page' : undefined} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon">
          <BottomNavBall />
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <QuadraIcon />
        </span>
        Início
      </Link>

      <Link href="/peladas" className={`pl-bottom-nav-item ${emPeladas ? 'active' : ''}`} aria-current={emPeladas ? 'page' : undefined} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon">
          <BottomNavBall />
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <PeladasBallIcon />
        </span>
        Peladas
      </Link>

      <CriarButton />

      <NotificationBell variant="bottomnav" />

      <Link href="/perfil" className={`pl-bottom-nav-item ${emPerfil ? 'active' : ''}`} aria-current={emPerfil ? 'page' : undefined} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon">
          <BottomNavBall />
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <ShieldIcon />
        </span>
        Perfil
      </Link>

      <Link href="/organizar" className={`pl-bottom-nav-item ${emOrganizar ? 'active' : ''}`} aria-current={emOrganizar ? 'page' : undefined} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon">
          <BottomNavBall />
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <OrganizarIcon />
        </span>
        Organizar
      </Link>
    </nav>
  );
}
