'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import NotificationBell from './NotificationBell';
import QuadraIcon from './QuadraIcon';
import PeladasBallIcon from './PeladasBallIcon';
import ShieldIcon from './ShieldIcon';
import OrganizarIcon from './OrganizarIcon';
import CriarButton from './CriarButton';
import BottomNavBall from './BottomNavBall';
import { tapFlash } from '@/lib/tapFlash';
import {
  ORDEM_NAV, ROTA_POR_INDICE, indiceDaRota, offsetMaisProximo, geometriaDoOffset, proximoIndiceNavegavel,
} from '@/lib/bottomNavWheel';

const LABEL = { inicio: 'Início', peladas: 'Peladas', avisos: 'Avisos', perfil: 'Perfil', organizar: 'Organizar' };
const ICONE = { inicio: QuadraIcon, peladas: PeladasBallIcon, perfil: ShieldIcon, organizar: OrganizarIcon };

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

// "A Quadra Viva" — navegação inferior fixa (mobile), agora um carrossel:
// o item da rota ativa sempre fica no centro, os outros 5 se organizam ao
// redor numa ordem circular fixa (ORDEM_NAV). Trocar de aba não teleporta
// nem reordena o DOM — cada item é um slot absolutamente posicionado que
// desliza pra sua nova posição relativa ao novo centro (offsetMaisProximo
// escolhe sempre o caminho mais curto). Rotas/páginas/lógica de cada
// destino continuam as mesmas de sempre; só o visual/interação mudou.
export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const reduzido = useReducedMotion();

  const rotaIndex = indiceDaRota(pathname);
  // Sticky: uma rota que não é nenhuma das 5 abas (ex: /pelada/[id]) não
  // deve resetar a roda pra posição nenhuma — mantém o último centro
  // válido, só sem marcar ninguém como .active/aria-current.
  const centroRef = useRef(0);
  if (rotaIndex != null) centroRef.current = rotaIndex;
  const centro = centroRef.current;

  // offset de cada item no render anterior — base pra offsetMaisProximo
  // escolher o caminho mais curto a partir de onde cada um já estava, não
  // de um valor normalizado fixo (ver comentário na função).
  const offsetsAnterioresRef = useRef({});
  const offsets = ORDEM_NAV.map((_, i) => offsetMaisProximo(i, centro, offsetsAnterioresRef.current[i]));
  useEffect(() => {
    const novo = {};
    offsets.forEach((o, i) => { novo[i] = o; });
    offsetsAnterioresRef.current = novo;
  });

  // Swipe horizontal simples: mede o gesto do início ao fim (sem
  // arrastar a roda ao vivo — é um passo de cada vez, pra não precisar de
  // física de "solta e continua girando"). Nunca chama preventDefault:
  // a barra é fixa e não faz parte do conteúdo rolável da página, então
  // não há rolagem vertical pra atrapalhar aqui.
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

  if (!user) return null;

  return (
    <nav
      className={`pl-bottom-nav ${reduzido ? 'pl-nav-flat' : 'pl-nav-wheel'}`}
      aria-label="Navegação principal"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { swipeRef.current = null; }}
    >
      <BottomNavBall key={reduzido ? 'flat' : centro} reduzido={reduzido} />

      {ORDEM_NAV.map((id, i) => {
        const geo = reduzido ? null : geometriaDoOffset(offsets[i]);
        // Duração/easing do slide moram só no CSS (.pl-nav-slot), como
        // literais — só a POSIÇÃO precisa vir de JS (depende de onde cada
        // item está na roda agora). Sem reduced-motion pra conciliar aqui:
        // esse ramo inteiro (geo!=null) só roda quando `reduzido` é falso;
        // o modo reduzido usa outra árvore de estilo (.pl-nav-flat, só CSS).
        const style = geo
          ? {
              transform: `translate(-50%, -50%) translate(${geo.x}px, ${geo.y}px) scale(${geo.scale}) rotate(${geo.tilt}deg)`,
              opacity: geo.opacity,
              zIndex: geo.zIndex,
            }
          : undefined;

        if (id === 'criar') {
          // Ação, não rota — nunca ganha .active/aria-current, e clicar
          // nela sempre dispara o fluxo de criar, não importa em que
          // posição da roda ela esteja no momento (CriarButton cuida do
          // próprio onClick, intocado; só a posição dele na barra é
          // gerenciada aqui).
          return (
            <span key={id} className="pl-nav-slot" style={style}>
              <CriarButton />
            </span>
          );
        }
        if (id === 'avisos') {
          return (
            <span key={id} className="pl-nav-slot" style={style}>
              <NotificationBell variant="bottomnav" />
            </span>
          );
        }
        const ativo = rotaIndex === i;
        const Icone = ICONE[id];
        return (
          <span key={id} className="pl-nav-slot" style={style}>
            <Link
              href={ROTA_POR_INDICE[i]}
              className={`pl-bottom-nav-item ${ativo ? 'active' : ''}`}
              aria-current={ativo ? 'page' : undefined}
              onClick={tapFlash}
            >
              <span className="pl-bottom-nav-icon">
                <span className="pl-bottom-nav-flash" aria-hidden="true" />
                <Icone />
              </span>
              <span className="pl-bottom-nav-label">{LABEL[id]}</span>
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
