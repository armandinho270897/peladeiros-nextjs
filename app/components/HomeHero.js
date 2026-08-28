'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';
import Brand from './Brand';
import { imagemDoTipo } from '@/lib/tipoJogoImagem';
import { PATENTES } from '@/lib/patentes';

// Aura de fundo ligada à patente — intensidade e alcance crescem conforme
// sobe de nível (Novato quase imperceptível, Lenda bem mais presente).
// Sutil de propósito: nunca passa de opacity 0.26 pra não prejudicar a
// legibilidade do texto por cima. Chaveada pelo id estável de lib/patentes.js
// (não pelo nome de exibição) — um ajuste de copy no nome da patente não
// pode silenciosamente quebrar essa tabela.
const AURA_POR_PATENTE_ID = {
  novato: { opacity: 0.05, w: 220, h: 160 },
  cria: { opacity: 0.09, w: 260, h: 190 },
  estrela: { opacity: 0.14, w: 300, h: 220 },
  referencia: { opacity: 0.19, w: 340, h: 250 },
  lenda: { opacity: 0.26, w: 400, h: 300 },
};
// Confere em tempo de import que toda patente conhecida tem aura definida —
// se uma nova patente for adicionada em lib/patentes.js e essa tabela não
// for atualizada junto, isso avisa alto (console.error) em vez de cair
// silenciosamente na aura padrão pra sempre.
for (const p of PATENTES) {
  if (!AURA_POR_PATENTE_ID[p.id]) console.error(`HomeHero: falta aura pra patente "${p.id}" (${p.nome})`);
}
const AURA_PADRAO = AURA_POR_PATENTE_ID.novato;

// Parallax em 3 camadas, sem lib: um listener de scroll com rAF move o
// fundo (arte de modalidade, quase parado) e a camada intermediária
// (textura de grafite) em velocidades diferentes; o conteúdo (saudação,
// cards) segue o scroll normal, sem transform. background-attachment:fixed
// faria o mesmo com menos código, mas não funciona no Safari do iOS
// (limitação conhecida do WebKit), inaceitável pra um app majoritariamente
// mobile.
export default function HomeHero({ profile, tipo, statusFrase, patenteId }) {
  const bgRef = useRef(null);
  const midRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    function update() {
      const y = window.scrollY;
      if (bgRef.current) bgRef.current.style.transform = `translateY(${y * 0.15}px)`;
      if (midRef.current) midRef.current.style.transform = `translateY(${y * 0.5}px)`;
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
  const aura = AURA_POR_PATENTE_ID[patenteId] || AURA_PADRAO;

  return (
    <div className="pl-home-hero">
      <div
        className={`pl-home-hero-bg ${!src ? 'pl-art-banner-fallback' : ''}`}
        ref={bgRef}
        style={src ? { backgroundImage: `url(${src})` } : undefined}
      />
      <div className="pl-home-hero-mid" ref={midRef} aria-hidden="true" />
      <div
        className="pl-home-hero-aura"
        aria-hidden="true"
        style={{ background: `radial-gradient(ellipse ${aura.w}px ${aura.h}px at 50% 0%, rgba(166,255,0,${aura.opacity}), transparent 72%)` }}
      />
      <span className="pl-home-hero-orb pl-home-hero-orb-1" aria-hidden="true" />
      <span className="pl-home-hero-orb pl-home-hero-orb-2" aria-hidden="true" />
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
