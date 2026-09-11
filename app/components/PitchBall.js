'use client';
import { useEffect, useRef, useState } from 'react';

// Bola interativa do gramado atrás do cartão de login — física de
// verdade (gravidade, atrito, quique, colisão), não mais uma trajetória
// fixa em CSS. Filosofia inalterada do componente original: puramente
// lúdica, nunca atrapalha o formulário. Ver constantes abaixo pros
// parâmetros de física; resumo completo no relatório desta mudança.
//
// Arquitetura: posição/velocidade/rotação vivem em refs, nunca em state
// React — cada frame escreve direto em ball.style.transform via
// translate3d/rotate (paint()), sem re-render. requestAnimationFrame só
// roda enquanto a bola está em movimento (moving.current) e é cancelado
// quando ela "dorme" (settling), quando a aba perde visibilidade, ou no
// unmount. A "zona de gramado" é medida em runtime como o espaço entre
// o fim do .pl-authcard e o rodapé da .pl-authpage — a bola nunca pode
// ser arrastada por cima do formulário porque a zona simplesmente não
// inclui essa área (não é uma checagem de colisão contra o cartão a
// cada frame, é a própria área de jogo que termina onde ele começa).

const GRAVITY = 2200; // px/s²
const RESTITUTION = 0.46; // fração de vy preservada a cada quique no chão/teto
const WALL_RESTITUTION = 0.55; // fração de vx preservada ao bater na lateral
const FRICTION = 1300; // px/s² de desaceleração horizontal enquanto encostada no chão
const ROTATION_PER_PX = 0.7; // graus de giro por px percorrido horizontalmente
const MAX_FLICK_SPEED = 1500; // px/s — teto pra velocidade de um arrastar-e-soltar
const MIN_REST_SPEED = 12; // px/s — abaixo disso a bola "dorme" e o rAF para
const BALL_DIAMETER = 54; // px
const SHADOW_W = 40;
const SHADOW_H = 12;
const MIN_ZONE_HEIGHT = 92; // px — abaixo disso não faz sentido mostrar a zona
const MAX_ZONE_HEIGHT = 220; // px — teto pra não virar metade da tela
const ZONE_MARGIN_TOP = 18; // respiro entre a zona e o cartão
const ZONE_MARGIN_BOTTOM = 14; // respiro entre a zona e a borda da viewport
const GOL_TEXTOS = ['GOOOL!', 'Na gaveta!'];

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function agora() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

export default function PitchBall() {
  const rootRef = useRef(null);
  const zoneRef = useRef(null);
  const ballRef = useRef(null);
  const shadowRef = useRef(null);

  const [reduced, setReduced] = useState(null); // null = ainda não sabemos (evita flash/mismatch)
  const [zoneHeight, setZoneHeight] = useState(0);
  const [golTexto, setGolTexto] = useState(null);
  const [pulse, setPulse] = useState(false);

  const pos = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const rot = useRef(0);
  const dims = useRef({ width: 0, height: 0 });
  const goalRect = useRef(null);
  const scored = useRef(false);
  const moving = useRef(false);
  const raf = useRef(null);
  const lastT = useRef(0);
  const dragging = useRef(false);
  const dragHist = useRef([]);

  const radius = BALL_DIAMETER / 2;

  // prefers-reduced-motion — decide o modo inteiro (física completa vs. botão simples)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  // mede a zona de jogo: o espaço entre o fim do cartão e o rodapé da página
  useEffect(() => {
    if (reduced !== false) return;
    const authpage = rootRef.current?.closest('.pl-authpage');
    const card = authpage?.querySelector('.pl-authcard');
    if (!authpage || !card) return;

    function recalc() {
      const pageRect = authpage.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const disponivel = pageRect.bottom - cardRect.bottom - ZONE_MARGIN_TOP - ZONE_MARGIN_BOTTOM;
      const altura = Math.min(MAX_ZONE_HEIGHT, Math.max(0, disponivel));
      setZoneHeight(altura < MIN_ZONE_HEIGHT ? 0 : Math.round(altura));
    }
    recalc();

    const ro = new ResizeObserver(recalc);
    ro.observe(authpage);
    ro.observe(card);
    window.addEventListener('resize', recalc);
    return () => { ro.disconnect(); window.removeEventListener('resize', recalc); };
  }, [reduced]);

  // motor de física — monta uma vez que sabemos reduced===false e a zona existe
  useEffect(() => {
    if (reduced !== false || zoneHeight <= 0) return;
    const ball = ballRef.current;
    const zoneEl = zoneRef.current;
    const shadow = shadowRef.current;
    if (!ball || !zoneEl) return;

    let suppressClick = false;
    let pointerStart = null;

    function measure() {
      const rect = zoneEl.getBoundingClientRect();
      dims.current = { width: rect.width, height: rect.height };
      goalRect.current = {
        x1: rect.width - 74, y1: rect.height - 54,
        x2: rect.width - 14, y2: rect.height - 6,
      };
      if (pos.current.x === 0 && pos.current.y === 0) {
        pos.current = { x: rect.width * 0.28, y: rect.height - radius };
      } else {
        pos.current.x = clamp(pos.current.x, radius, Math.max(radius, rect.width - radius));
        pos.current.y = clamp(pos.current.y, radius, Math.max(radius, rect.height - radius));
      }
      paint();
    }

    function paint() {
      const p = pos.current;
      ball.style.transform = `translate3d(${p.x - radius}px, ${p.y - radius}px, 0) rotate(${rot.current}deg)`;
      if (shadow) {
        const floor = dims.current.height - radius;
        const airborne = Math.max(0, floor - p.y);
        const scale = clamp(1 - airborne / 130, 0.3, 1);
        const opacity = clamp(0.45 - airborne / 260, 0.1, 0.45);
        shadow.style.transform = `translate3d(${p.x - SHADOW_W / 2}px, ${floor + radius - SHADOW_H / 2 + 4}px, 0) scale(${scale})`;
        shadow.style.opacity = String(opacity);
      }
    }

    function checkGoal() {
      if (scored.current) return;
      const g = goalRect.current;
      const p = pos.current;
      if (!g) return;
      if (p.x >= g.x1 && p.x <= g.x2 && p.y >= g.y1 && p.y <= g.y2) {
        scored.current = true;
        vel.current = { x: 0, y: 0 };
        setGolTexto(GOL_TEXTOS[Math.floor(Math.random() * GOL_TEXTOS.length)]);
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(18);
        setTimeout(() => {
          scored.current = false;
          setGolTexto(null);
          const { width, height } = dims.current;
          pos.current = { x: width * 0.28, y: height - radius };
          rot.current = 0;
          paint();
        }, 1100);
      }
    }

    function step(t) {
      if (!lastT.current) lastT.current = t;
      let dt = (t - lastT.current) / 1000;
      lastT.current = t;
      if (dt > 0.05) dt = 0.05; // evita salto grande depois de aba oculta/travada

      if (!dragging.current && !scored.current) {
        const v = vel.current;
        const p = pos.current;
        const { width, height } = dims.current;
        v.y += GRAVITY * dt;
        p.x += v.x * dt;
        p.y += v.y * dt;

        const floor = height - radius;
        if (p.y >= floor) {
          p.y = floor;
          v.y = v.y > 40 ? -v.y * RESTITUTION : 0;
          const sign = Math.sign(v.x);
          v.x = Math.max(0, Math.abs(v.x) - FRICTION * dt) * sign;
        }
        if (p.y <= radius) { p.y = radius; v.y = Math.abs(v.y) * RESTITUTION; }
        if (p.x <= radius) { p.x = radius; v.x = Math.abs(v.x) * WALL_RESTITUTION; }
        if (p.x >= width - radius) { p.x = width - radius; v.x = -Math.abs(v.x) * WALL_RESTITUTION; }

        rot.current += v.x * dt * ROTATION_PER_PX;
      }

      paint();
      checkGoal();

      const v = vel.current;
      const grounded = pos.current.y >= dims.current.height - radius - 0.5;
      const stillMoving = !scored.current && (Math.abs(v.x) > MIN_REST_SPEED || Math.abs(v.y) > MIN_REST_SPEED || !grounded);
      if (stillMoving) {
        raf.current = requestAnimationFrame(step);
      } else {
        moving.current = false;
        raf.current = null;
        vel.current = { x: 0, y: 0 };
      }
    }

    function ensureLoop() {
      if (!moving.current) {
        moving.current = true;
        lastT.current = 0;
        raf.current = requestAnimationFrame(step);
      }
    }

    function kick() {
      const dir = Math.random() < 0.5 ? -1 : 1;
      vel.current = { x: dir * (300 + Math.random() * 250), y: -(700 + Math.random() * 250) };
      scored.current = false;
      ensureLoop();
    }

    function localFromClient(clientX, clientY) {
      const rect = zoneEl.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function onPointerMove(e) {
      if (!dragging.current) return;
      const { width, height } = dims.current;
      const local = localFromClient(e.clientX, e.clientY);
      pos.current.x = clamp(local.x, radius, Math.max(radius, width - radius));
      pos.current.y = clamp(local.y, radius, Math.max(radius, height - radius));
      const t = agora();
      dragHist.current.push({ x: local.x, y: local.y, t });
      if (dragHist.current.length > 8) dragHist.current.shift();
      paint();
    }

    function onPointerUp(e) {
      if (!dragging.current) return;
      dragging.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      try { ball.releasePointerCapture(e.pointerId); } catch { /* já liberado */ }

      // preventDefault() no pointerdown (necessário pra evitar scroll/zoom
      // ao arrastar no touch) pode suprimir o "click" sintético seguinte
      // em vários navegadores — se ele nunca vier, suppressClick ficaria
      // travado em true pra sempre e bloquearia o próximo Enter/Espaço do
      // teclado. Por isso ele se limpa sozinho pouco depois, não só
      // quando um click de verdade aparece pra consumi-lo.
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 400);
      const dist = pointerStart ? Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) : 0;

      if (dist < 6) { kick(); return; } // arrasto curto demais = toque simples

      const hist = dragHist.current;
      let vx = 0, vy = 0;
      if (hist.length >= 2) {
        const last = hist[hist.length - 1];
        let ref = hist[0];
        for (let i = hist.length - 1; i >= 0; i--) {
          if (last.t - hist[i].t >= 60) { ref = hist[i]; break; }
          ref = hist[i];
        }
        const dtMs = Math.max(16, last.t - ref.t);
        vx = (last.x - ref.x) / (dtMs / 1000);
        vy = (last.y - ref.y) / (dtMs / 1000);
      }
      const speed = Math.hypot(vx, vy);
      if (speed > MAX_FLICK_SPEED) {
        const s = MAX_FLICK_SPEED / speed;
        vx *= s; vy *= s;
      }
      vel.current = { x: vx, y: vy };
      scored.current = false;
      ensureLoop();
    }

    function onPointerDown(e) {
      e.preventDefault();
      dragging.current = true;
      vel.current = { x: 0, y: 0 };
      dragHist.current = [];
      pointerStart = { x: e.clientX, y: e.clientY };
      try { ball.setPointerCapture(e.pointerId); } catch { /* toque sintético sem capture */ }
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    // clique "puro" (teclado Enter/Espaço, que não passa por pointerdown/up)
    // dispara o mesmo chute; clique originado de um pointerup já tratado
    // é ignorado via suppressClick, senão chutaria duas vezes por toque.
    function onClick() {
      if (suppressClick) { suppressClick = false; return; }
      kick();
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(zoneEl);
    ball.addEventListener('pointerdown', onPointerDown);
    ball.addEventListener('click', onClick);

    function onVis() {
      if (document.hidden) {
        if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null; }
      } else if (moving.current && !raf.current) {
        lastT.current = 0;
        raf.current = requestAnimationFrame(step);
      }
    }
    document.addEventListener('visibilitychange', onVis);

    return () => {
      ro.disconnect();
      ball.removeEventListener('pointerdown', onPointerDown);
      ball.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      moving.current = false;
    };
  }, [reduced, zoneHeight, radius]);

  if (reduced === null) return null; // ainda não sabemos a preferência — não renderiza nada

  const BolaSvg = ({ size }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="pl-ball-shade" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e9e9e4" />
          <stop offset="100%" stopColor="#b9b9b2" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#pl-ball-shade)" stroke="#15130F" strokeWidth="2" />
      <path d="M50 24 L61 32 L57 45 L43 45 L39 32 Z" fill="#15130F" />
      <path d="M22 44 L33 40 L38 52 L30 62 L18 58 Z" fill="#15130F" opacity="0.92" />
      <path d="M78 44 L67 40 L62 52 L70 62 L82 58 Z" fill="#15130F" opacity="0.92" />
      <path d="M50 78 L40 70 L44 58 L56 58 L60 70 Z" fill="#15130F" opacity="0.92" />
      <ellipse cx="34" cy="28" rx="14" ry="9" fill="rgba(255,255,255,0.55)" />
    </svg>
  );

  if (reduced) {
    // sem física nenhuma: um botão parado, feedback curto (escala) ao tocar,
    // sem qualquer simulação de movimento — só o essencial pedido.
    return (
      <button
        type="button"
        ref={rootRef}
        className={`pl-pitch-ball-simple ${pulse ? 'pl-pulse' : ''}`}
        onClick={() => setPulse(true)}
        onAnimationEnd={() => setPulse(false)}
        aria-label="Chutar bola decorativa"
      >
        <BolaSvg size={BALL_DIAMETER} />
      </button>
    );
  }

  return (
    // top/right/bottom/left explícitos em vez de "inset" — alguns WebViews
    // mobile descartam a declaração inteira com o atalho (mesmo motivo já
    // documentado em .pl-onboarding-overlay).
    <div
      ref={rootRef}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' }}
      aria-hidden={zoneHeight <= 0}
    >
      {zoneHeight > 0 && (
        <div className="pl-pitch-zone" ref={zoneRef} style={{ height: zoneHeight }}>
          <div className="pl-pitch-goal" aria-hidden="true" />
          <div className="pl-pitch-ball-shadow" ref={shadowRef} aria-hidden="true" />
          <button
            type="button"
            ref={ballRef}
            className="pl-pitch-ball-btn"
            aria-label="Chutar bola decorativa"
            style={{ width: BALL_DIAMETER, height: BALL_DIAMETER }}
          >
            <BolaSvg size={BALL_DIAMETER} />
          </button>
          {golTexto && <div className="pl-pitch-gol-txt" aria-live="polite">{golTexto}</div>}
        </div>
      )}
    </div>
  );
}
