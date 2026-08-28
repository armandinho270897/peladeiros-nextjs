'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';
import Brand from './Brand';
import { imagemDoTipo } from '@/lib/tipoJogoImagem';

// Parallax leve, sem lib: transform num listener de scroll com rAF — o
// fundo se move a 40% da velocidade do scroll. background-attachment:fixed
// faria o mesmo efeito com menos código, mas não funciona no Safari do
// iOS (limitação conhecida do WebKit), inaceitável pra um app majoritariamente mobile.
export default function HomeHero({ profile, tipo, statusFrase }) {
  const bgRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    function update() {
      if (bgRef.current) bgRef.current.style.transform = `translateY(${window.scrollY * 0.4}px)`;
      ticking = false;
    }
    function onScroll() {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const src = imagemDoTipo(tipo);
  const primeiroNome = profile?.nome?.split(' ')[0] || '';

  return (
    <div className="pl-home-hero">
      <div
        className={`pl-home-hero-bg ${!src ? 'pl-art-banner-fallback' : ''}`}
        ref={bgRef}
        style={src ? { backgroundImage: `url(${src})` } : undefined}
      />
      <div className="pl-home-hero-topbar">
        <Brand />
        {profile && (
          <div className="pl-header-user">
            <span className="pl-header-bell"><NotificationBell /></span>
            <Link href="/perfil" className="pl-header-user-link" aria-label="Ver perfil">
              <Avatar nome={profile.nome} size={28} fotoUrl={profile.foto_url} />
            </Link>
          </div>
        )}
      </div>
      <div className="pl-home-hero-content">
        <h1 className="pl-home-hero-greeting">{primeiroNome ? `Fala, ${primeiroNome}` : 'Fala!'}</h1>
        {statusFrase && <p className="pl-home-hero-status">{statusFrase}</p>}
      </div>
    </div>
  );
}
