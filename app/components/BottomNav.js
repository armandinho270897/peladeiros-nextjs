'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import NotificationBell from './NotificationBell';
import HomeIcon from './HomeIcon';
import PeladasIcon from './PeladasIcon';
import PersonIcon from './PersonIcon';

// Navegação inferior fixa (mobile) — atalhos pro que já existe no app hoje:
// Início (recorte curado), Peladas (navegação completa em /peladas), criar
// pelada, avisos (mesmo sino do header, painel abrindo pra cima) e perfil.
export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav className="pl-bottom-nav" aria-label="Navegação principal">
      <Link href="/" className={`pl-bottom-nav-item ${pathname === '/' ? 'active' : ''}`}>
        <span className="pl-bottom-nav-icon"><HomeIcon /></span>
        Início
      </Link>
      <Link href="/peladas" className={`pl-bottom-nav-item ${pathname === '/peladas' ? 'active' : ''}`}>
        <span className="pl-bottom-nav-icon"><PeladasIcon /></span>
        Peladas
      </Link>
      <Link href="/?criar=1" className="pl-bottom-nav-central" aria-label="Criar pelada">+</Link>
      <NotificationBell variant="bottomnav" />
      <Link href="/perfil" className={`pl-bottom-nav-item ${pathname === '/perfil' ? 'active' : ''}`}>
        <span className="pl-bottom-nav-icon"><PersonIcon /></span>
        Perfil
      </Link>
    </nav>
  );
}
