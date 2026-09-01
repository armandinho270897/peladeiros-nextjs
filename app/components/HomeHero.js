'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';
import Brand from './Brand';
import { useImagensTelainicial } from '@/lib/useImagensTelainicial';
import { PATENTES } from '@/lib/patentes';

// Troca automática do fundo enquanto o app fica aberto — 5 minutos é o
// ponto de partida pedido; ajustar aqui se parecer rápido/devagar demais
// na prática (sem outro lugar que precise mudar).
const TROCA_FUNDO_MS = 5 * 60 * 1000;

// Sorteia uma imagem da lista evitando repetir a atual (se houver mais de
// uma opção) — sem isso, a troca periódica podia "trocar" pra mesma
// imagem por coincidência e parecer que nada aconteceu.
function sortearFundo(lista, atual) {
  if (!lista.length) return null;
  if (lista.length === 1) return lista[0];
  let escolha;
  do { escolha = lista[Math.floor(Math.random() * lista.length)]; } while (escolha === atual);
  return escolha;
}

// As artes em public/imagens_telainicial/ são arquivos grandes (~3MB cada)
// — passa pelo otimizador de imagem do Next em vez de servir o PNG cru
// pra um fundo que só precisa cobrir a tela. Único ponto de definição:
// usado tanto no pré-carregamento quanto no background-image de verdade,
// pra garantir que a URL pré-carregada é EXATAMENTE a que o navegador vai
// pedir de novo (senão o pré-carregamento não pega cache e não adianta).
function urlOtimizada(src) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=1200&q=70`;
}

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
// fundo (arte artística sorteada, quase parado) e a camada intermediária
// (textura de grafite) em velocidades diferentes; o conteúdo (saudação,
// cards) segue o scroll normal, sem transform. background-attachment:fixed
// faria o mesmo com menos código, mas não funciona no Safari do iOS
// (limitação conhecida do WebKit), inaceitável pra um app majoritariamente
// mobile.
export default function HomeHero({ profile, statusFrase, patenteId }) {
  const bgRef = useRef(null);
  const midRef = useRef(null);
  const imagensTelainicial = useImagensTelainicial();

  // Duas camadas fixas (0 e 1) que alternam qual está "na frente" (opacity
  // 1) — trocar o backgroundImage de UM node não anima; alternar a opacity
  // entre dois nodes estáveis (mesma key sempre) é o que faz o CSS
  // transition rodar como crossfade de verdade. srcs[i]=null enquanto a
  // lista ainda não carregou.
  const [fundo, setFundo] = useState({ frente: 0, srcs: [null, null] });
  const primeiraEscolha = useRef(false);
  // Espelha o estado mais recente pro setInterval poder ler sem precisar
  // recriar o timer a cada troca (senão o efeito abaixo teria que depender
  // de `fundo`, reiniciando a contagem de 5min toda vez que ela mudasse).
  const fundoRef = useRef(fundo);
  useEffect(() => { fundoRef.current = fundo; }, [fundo]);

  // Sorteio inicial — uma vez, assim que a lista de imagens chega (troca a
  // cada nova sessão/abertura porque o componente remonta do zero).
  useEffect(() => {
    if (primeiraEscolha.current || imagensTelainicial.length === 0) return;
    primeiraEscolha.current = true;
    setFundo({ frente: 0, srcs: [sortearFundo(imagensTelainicial, null), null] });
  }, [imagensTelainicial]);

  // Troca periódica com crossfade — só faz sentido com 2+ imagens. Pré-
  // carrega a próxima imagem (Image() do browser) ANTES de virar a
  // camada visível — sem isso, numa conexão lenta o crossfade podia
  // revelar uma camada em branco enquanto a imagem nova ainda baixa. Se a
  // imagem falhar (onerror), aplica assim mesmo em vez de travar aquele
  // ciclo — a próxima troca, 5min depois, tenta de novo com outra imagem.
  useEffect(() => {
    if (imagensTelainicial.length < 2) return;
    let cancelado = false;
    const id = setInterval(() => {
      const atual = fundoRef.current;
      const outraCamada = atual.frente === 0 ? 1 : 0;
      const escolhido = sortearFundo(imagensTelainicial, atual.srcs[atual.frente]);

      const img = new window.Image();
      const aplicar = () => {
        if (cancelado) return;
        setFundo((maisAtual) => {
          const novosSrcs = [...maisAtual.srcs];
          novosSrcs[outraCamada] = escolhido;
          return { frente: outraCamada, srcs: novosSrcs };
        });
      };
      img.onload = aplicar;
      img.onerror = aplicar;
      img.src = urlOtimizada(escolhido);
    }, TROCA_FUNDO_MS);
    return () => { cancelado = true; clearInterval(id); };
  }, [imagensTelainicial]);

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

  const primeiroNome = profile?.nome?.split(' ')[0] || '';
  const aura = AURA_POR_PATENTE_ID[patenteId] || AURA_PADRAO;
  const semImagemAinda = !fundo.srcs[0] && !fundo.srcs[1];

  return (
    <div className="pl-home-hero">
      <div className={`pl-home-hero-bg ${semImagemAinda ? 'pl-art-banner-fallback' : ''}`} ref={bgRef}>
        {fundo.srcs.map((src, i) => src && (
          // key fixa por slot (0/1), não pelo src: precisa ser o MESMO node
          // trocando de imagem/opacity pro CSS transition rodar como
          // crossfade — um node novo a cada troca (key=src) não teria
          // "de onde" transicionar.
          <div
            key={i}
            className={`pl-home-hero-bg-layer ${i === fundo.frente ? 'is-visivel' : ''}`}
            style={{ backgroundImage: `url(${urlOtimizada(src)})` }}
          />
        ))}
      </div>
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
