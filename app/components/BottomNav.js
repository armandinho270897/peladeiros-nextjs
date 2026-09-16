'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import NotificationBell from './NotificationBell';
import NavIcon from './icons/NavIcon';
import BottomNavBall from './BottomNavBall';
import CriarButton from './CriarButton';
import OrganizarFab from './OrganizarFab';
import { tapFlash } from '@/lib/tapFlash';
import { ORDEM_NAV, ROTA_POR_INDICE, indiceDaRota, proximoIndiceNavegavel } from '@/lib/bottomNavWheel';

const LABEL = { inicio: 'Início', peladas: 'Peladas', avisos: 'Avisos', perfil: 'Perfil' };

function useReducedMotion() {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduzido(mq.matches);
    const onChange = (e) => setReduzido(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduzido;
}

// Limiar de swipe: só conta como gesto horizontal intencional se andou o
// suficiente NA HORIZONTAL e claramente mais que na vertical — abaixo
// disso, ou mais vertical que horizontal, o gesto é ignorado (não atrapalha
// rolagem da página, que nem passa pela barra fixa mesmo, mas evita
// disparar navegação num toque que só tremeu a mão).
const SWIPE_MIN_PX = 42;
const SWIPE_RAZAO_MIN = 1.3;

// "A Quadra Viva" — navegação inferior fixa (mobile): 5 posições numa
// ORDEM FIXA (ORDEM_NAV) que nunca reordena — início, peladas, criar,
// avisos, perfil sempre nessa mesma sequência da esquerda pra direita,
// como uma barra de abas nativa comum. A aba da rota ativa só muda de
// ESTILO (ícone maior, bola neon atrás dele, leve elevação) no lugar
// onde ela já está — nada se desloca lateralmente. Swipe horizontal
// ainda navega pra próxima/anterior aba NAVEGÁVEL (pula "criar"), só que
// sem nenhuma animação de reposicionamento pra acompanhar (é só troca de
// rota). Rotas/páginas/lógica de cada destino continuam as mesmas de
// sempre; só o visual/interação mudou.
export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const reduzido = useReducedMotion();

  const rotaIndex = indiceDaRota(pathname);
  // Sticky: uma rota que não é nenhuma das 4 abas (ex: /pelada/[id],
  // /organizar) não deve zerar o "último destino" usado pelo swipe —
  // mantém o último válido, só sem marcar ninguém como .active/aria-current.
  const centroRef = useRef(0);
  if (rotaIndex != null) centroRef.current = rotaIndex;
  const centro = centroRef.current;

  // Swipe horizontal simples: mede o gesto do início ao fim. Nunca chama
  // preventDefault: a barra é fixa e não faz parte do conteúdo rolável da
  // página, então não há rolagem vertical pra atrapalhar aqui.
  const swipeRef = useRef(null);
  function onPointerDown(e) {
    swipeRef.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e) {
    const inicio = swipeRef.current;
    swipeRef.current = null;
    if (!inicio) return;
    const dx = e.clientX - inicio.x;
    const dy = e.clientY - inicio.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_RAZAO_MIN) return;
    const direcao = dx < 0 ? 1 : -1;
    const alvo = proximoIndiceNavegavel(centro, direcao);
    router.push(ROTA_POR_INDICE[alvo]);
  }

  // /admin é uma área operacional separada, com navegação própria (abas no
  // topo) — a barra de baixo do app comum (e o FAB de Organizar) não fazem
  // sentido sobrepostos nela.
  if (!user || pathname?.startsWith('/admin')) return null;

  return (
    <>
      <OrganizarFab reduzido={reduzido} />
      <nav
        className="pl-bottom-nav pl-nav-flat"
        aria-label="Navegação principal"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipeRef.current = null; }}
      >
        {ORDEM_NAV.map((id, i) => {
          if (id === 'criar') {
            // Ação, não rota — nunca ganha .active/aria-current; clicar
            // nela sempre dispara o fluxo de criar (CriarButton cuida do
            // próprio onClick, intocado).
            return (
              <span key={id} className="pl-nav-slot">
                <CriarButton />
              </span>
            );
          }
          if (id === 'avisos') {
            return (
              <span key={id} className="pl-nav-slot">
                <NotificationBell variant="bottomnav" />
              </span>
            );
          }
          const ativo = rotaIndex === i;
          return (
            <span key={id} className="pl-nav-slot">
              <Link
                href={ROTA_POR_INDICE[i]}
                className={`pl-bottom-nav-item ${ativo ? 'active' : ''}`}
                aria-current={ativo ? 'page' : undefined}
                onClick={tapFlash}
              >
                <span className="nav-icon-shell">
                  <BottomNavBall />
                  <span className="pl-bottom-nav-flash" aria-hidden="true" />
                  <NavIcon id={id} active={ativo} />
                </span>
                <span className="pl-bottom-nav-label">{LABEL[id]}</span>
              </Link>
            </span>
          );
        })}
      </nav>
    </>
  );
}
