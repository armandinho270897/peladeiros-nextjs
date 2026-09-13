'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import OrganizarIcon from './OrganizarIcon';
import { tapFlash } from '@/lib/tapFlash';

// "Organizar" saiu do carrossel de abas (lib/bottomNavWheel.js) e virou
// esse botão flutuante à parte — fica ancorado num ponto fixo da barra,
// perto de onde o "+" de criar pelada normalmente aparece, sem girar
// junto com a roda. Some/aparece com um pop elástico ao montar; depois
// disso fica parado (mesma filosofia do botão central: brilho estático,
// sem loop contínuo piscando).
export default function OrganizarFab() {
  const pathname = usePathname();
  const ativo = pathname != null && pathname.startsWith('/organizar');

  return (
    <Link
      href="/organizar"
      className={`pl-organizar-fab ${ativo ? 'active' : ''}`}
      aria-label="Organizar"
      aria-current={ativo ? 'page' : undefined}
      onClick={tapFlash}
    >
      <span className="pl-bottom-nav-flash" aria-hidden="true" />
      <OrganizarIcon size={21} />
    </Link>
  );
}
