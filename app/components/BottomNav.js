'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import NotificationBell from './NotificationBell';
import QuadraIcon from './QuadraIcon';
import PeladasBallIcon from './PeladasBallIcon';
import ShieldIcon from './ShieldIcon';
import CriarButton from './CriarButton';
import OrganizarFab from './OrganizarFab';
import { tapFlash } from '@/lib/tapFlash';
import {
  ORDEM_NAV, ROTA_POR_INDICE, indiceDaRota, offsetMaisProximo, geometriaDoOffset, proximoIndiceNavegavel,
  LARGURA_PADRAO,
} from '@/lib/bottomNavWheel';

// SSR-safe: useLayoutEffect avisa no console em render de servidor. Next
// só renderiza esse componente no cliente de qualquer forma (é 'use
// client' e depende de matchMedia/ResizeObserver), mas o import do React
// ainda passa pelo servidor durante a montagem da árvore — trocar por um
// no-op fora do browser evita o aviso sem mudar o comportamento.
const useLayoutEffectSeguro = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const LABEL = { inicio: 'Início', peladas: 'Peladas', avisos: 'Avisos', perfil: 'Perfil' };
const ICONE = { inicio: QuadraIcon, peladas: PeladasBallIcon, perfil: ShieldIcon };

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

// "A Quadra Viva" — navegação inferior fixa (mobile), um carrossel RASO:
// o item da rota ativa sempre fica no centro, os outros 4 se organizam ao
// redor numa ordem circular fixa (ORDEM_NAV), sempre na MESMA linha de
// base (sem curva, sem rotação — só translateX + leve scale/opacity).
// Trocar de aba não teleporta nem reordena o DOM — cada item é um slot
// absolutamente posicionado que desliza pra sua nova posição relativa ao
// novo centro (offsetMaisProximo escolhe sempre o caminho mais curto),
// com a geometria calculada a partir da largura REAL medida da barra (ver
// `largura` abaixo), não de um valor fixo — é isso que mantém o item
// central exatamente no eixo do centro do viewport em qualquer largura de
// tela. A bola neon vive dentro do ícone de cada item (CSS, ver
// .pl-bottom-nav-icon::before em globals.css) — viaja junto com o item,
// não precisa de componente/posição própria. Rotas/páginas/lógica de cada
// destino continuam as mesmas de sempre; só o visual/interação mudou.
export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const reduzido = useReducedMotion();

  const rotaIndex = indiceDaRota(pathname);
  // Sticky: uma rota que não é nenhuma das 4 abas (ex: /pelada/[id],
  // /organizar) não deve resetar a roda pra posição nenhuma — mantém o
  // último centro válido, só sem marcar ninguém como .active/aria-current.
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

  // Largura ÚTIL real da barra (clientWidth do <nav> — a mesma caixa que o
  // CSS "left:50%" do .pl-nav-slot usa como referência), medida ao vivo em
  // vez de assumida: é a partir dela que geometriaDoOffset calcula a
  // distância em px de cada item, então a geometria acompanha o viewport
  // de verdade (320/360/375/390/412px) em vez de usar um valor fixo que só
  // "encaixa direito" numa largura só. useLayoutEffect (não useEffect) pra
  // medir e aplicar ANTES do primeiro paint — evita um salto visível de
  // "layout errado -> layout certo" logo na entrada.
  const navRef = useRef(null);
  const [largura, setLargura] = useState(LARGURA_PADRAO);
  useLayoutEffectSeguro(() => {
    const el = navRef.current;
    if (!el) return undefined;
    const medir = () => {
      const w = el.clientWidth;
      if (w > 0) setLargura((atual) => (Math.abs(atual - w) > 0.5 ? w : atual));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    <>
      <OrganizarFab reduzido={reduzido} />
      <nav
        ref={navRef}
        className={`pl-bottom-nav ${reduzido ? 'pl-nav-flat' : 'pl-nav-wheel'}`}
        aria-label="Navegação principal"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipeRef.current = null; }}
      >
        {ORDEM_NAV.map((id, i) => {
          const geo = reduzido ? null : geometriaDoOffset(offsets[i], largura);
          // Duração/easing do slide moram só no CSS (.pl-nav-slot), como
          // literais — só a POSIÇÃO precisa vir de JS (depende de onde cada
          // item está na roda agora). Sem reduced-motion pra conciliar aqui:
          // esse ramo inteiro (geo!=null) só roda quando `reduzido` é falso;
          // o modo reduzido usa outra árvore de estilo (.pl-nav-flat, só CSS).
          const style = geo
            ? {
                transform: `translate(-50%, -50%) translate(${geo.x}px, 0) scale(${geo.scale})`,
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
    </>
  );
}
