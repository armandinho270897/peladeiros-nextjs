'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import NotificationBell from './NotificationBell';

// Navegação inferior fixa (mobile) — atalhos pro que já existe no app hoje,
// sem nenhuma rota ou funcionalidade nova: Início, mapa de peladas, criar
// pelada, avisos (mesmo sino do header, painel abrindo pra cima) e perfil.
export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav className="pl-bottom-nav" aria-label="Navegação principal">
      <Link href="/" className={`pl-bottom-nav-item ${pathname === '/' ? 'active' : ''}`}>
        <span className="pl-bottom-nav-icon">🏠</span>
        Início
      </Link>
      <Link href="/?mapa=1" className="pl-bottom-nav-item">
        <span className="pl-bottom-nav-icon">🗺️</span>
        Peladas
      </Link>
      <Link href="/?criar=1" className="pl-bottom-nav-central" aria-label="Criar pelada">+</Link>
      <NotificationBell variant="bottomnav" />
      <Link href="/perfil" className={`pl-bottom-nav-item ${pathname === '/perfil' ? 'active' : ''}`}>
        <span className="pl-bottom-nav-icon">👤</span>
        Perfil
      </Link>
    </nav>
  );
}
