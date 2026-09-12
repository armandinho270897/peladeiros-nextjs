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

// Índice de cada item na grade de 6 colunas (Criar fica na coluna 2, mas
// nunca é "ativo" — nenhuma rota aponta pra ele, então nunca entra nesse
// mapa). Única fonte de verdade de onde a bola deve estar; ver
// BottomNavBall.js pra como ela viaja até lá.
function indiceAtivo(pathname) {
  if (pathname === '/') return 0;
  if (pathname === '/peladas') return 1;
  if (pathname === '/avisos') return 3;
  if (pathname === '/perfil') return 4;
  if (pathname.startsWith('/organizar')) return 5;
  return null;
}

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
      <BottomNavBall activeIndex={indiceAtivo(pathname)} />

      <Link href="/" className={`pl-bottom-nav-item ${emInicio ? 'active' : ''}`} aria-current={emInicio ? 'page' : undefined} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon">
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <QuadraIcon />
        </span>
        <span className="pl-bottom-nav-label">Início</span>
      </Link>

      <Link href="/peladas" className={`pl-bottom-nav-item ${emPeladas ? 'active' : ''}`} aria-current={emPeladas ? 'page' : undefined} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon">
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <PeladasBallIcon />
        </span>
        <span className="pl-bottom-nav-label">Peladas</span>
      </Link>

      <CriarButton />

      <NotificationBell variant="bottomnav" />

      <Link href="/perfil" className={`pl-bottom-nav-item ${emPerfil ? 'active' : ''}`} aria-current={emPerfil ? 'page' : undefined} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon">
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <ShieldIcon />
        </span>
        <span className="pl-bottom-nav-label">Perfil</span>
      </Link>

      <Link href="/organizar" className={`pl-bottom-nav-item ${emOrganizar ? 'active' : ''}`} aria-current={emOrganizar ? 'page' : undefined} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon">
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <OrganizarIcon />
        </span>
        <span className="pl-bottom-nav-label">Organizar</span>
      </Link>
    </nav>
  );
}
