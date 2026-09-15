'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BackLink from '../components/BackLink';

const ABAS = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/arenas', label: 'Arenas' },
  { href: '/admin/denuncias', label: 'Denúncias' },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/peladas', label: 'Peladas' },
  { href: '/admin/avisos', label: 'Avisos' },
  { href: '/admin/auditoria', label: 'Auditoria' },
  { href: '/admin/configuracoes', label: 'Configurações' },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="pl-admin-header">
      <div className="pl-header"><BackLink href="/perfil">Perfil</BackLink></div>
      <h2 className="pl-admin-title">Administração</h2>
      <div className="pl-admin-tabs">
        {ABAS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`pl-tab ${pathname === a.href ? 'active' : ''}`}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
