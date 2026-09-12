'use client';
import { useEffect, useRef, useState } from 'react';

// Bola interativa do login — física de verdade, jogando na tela toda.
// V3: em vez de confinar a bola numa faixa abaixo do cartão, o campo de
// jogo agora é a .pl-authpage inteira — o cartão vira um obstáculo
// sólido (a bola quica nele e não pode ser arrastada pra dentro dele),
// não mais uma área simplesmente proibida que encolhia o espaço de jogo
// a uma faixinha no rodapé. Isso ainda cumpre "nunca por cima do
// formulário" (é sólido, ela ricocheteia) e resolve "deixar ir por toda
// a tela" ao mesmo tempo.
//
// Arquitetura inalterada na essência: posição/velocidade/rotação vivem
// em refs, nunca em state do React — cada frame escreve direto em
// transform via DOM (paint()), sem re-render. requestAnimationFrame só
// roda enquanto a bola se move de verdade, pausa em visibilitychange e
// é limpo no unmount.

const GRAVITY = 2600; // px/s²
const RESTITUTION = 0.46; // fração de vy preservada a cada quique no chão/teto (com pequena variação aleatória)
const WALL_RESTITUTION = 0.55; // fração de v preservada ao bater na lateral/cartão
const FRICTION = 1100; // px/s² de desaceleração horizontal enquanto encostada no chão
const AIR_DRAG = 0.35; // fração/s de resistência do ar no eixo x enquanto no ar (realismo: trajetória não é um vácuo perfeito)
const ROTATION_DEG_PER_RAD = 180 / Math.PI;
const MAX_FLICK_SPEED = 1800; // px/s — teto pra velocidade de um arrastar-e-soltar
const MIN_REST_SPEED = 12; // px/s — abaixo disso a bola "dorme" e o rAF para
const BALL_DIAMETER = 58; // px
const SHADOW_W = 42;
const SHADOW_H = 13;
const GOAL_W = 92;
const GOAL_H = 72;
const GOAL_MARGIN = 14; // distância do canto da tela
const GOL_TEXTOS = ['GOOOL!', 'Na gaveta!'];

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function agora() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

export default function PitchBall() {
  const rootRef = useRef(null);
  const ballRef = useRef(null);
  const shadowRef = useRef(null);

  const [reduced, setReduced] = useState(null); // null = ainda não sabemos (evita flash/mismatch)
  const [golTexto, setGolTexto] = useState(null);
  const [pulse, setPulse] = useState(false);

  const pos = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const rot = useRef(0);
  const dims = useRef({ width: 0, height: 0 });
  const cardRect = useRef(null);
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

  // motor de física — monta uma vez que sabemos reduced===false. O campo de
  // jogo é a .pl-authpage inteira; o .pl-authcard é lido só como obstáculo.
  useEffect(() => {
    if (reduced !== false) return;
    const zoneEl = rootRef.current;
    const ball = ballRef.current;
    const shadow = shadowRef.current;
    if (!zoneEl || !ball) return;

    const authpage = zoneEl.closest('.pl-authpage');
    const card = authpage?.querySelector('.pl-authcard');

    let suppressClick = false;
    let pointerStart = null;

    // resolveCard empurra a bola pra fora do CARTÃO, mas isso sozinho pode
    // jogar a posição pra fora da PÁGINA — o cartão fica perto o bastante
    // da borda em telas estreitas pra "sair pelo cartão" virar "sair da
    // tela" (x negativo, etc.), corrompendo o histórico de arrasto e a
    // física dali em diante. Por isso todo resolveCard() é seguido de um
    // re-clamp nos limites reais da página.
    function clampToPage(p) {
      const { width, height } = dims.current;
      p.x = clamp(p.x, radius, Math.max(radius, width - radius));
      p.y = clamp(p.y, radius, Math.max(radius, height - radius));
    }

    function reflectVel(v, nx, ny) {
      const vn = v.x * nx + v.y * ny;
      if (vn < 0) {
        const rest = 1 + WALL_RESTITUTION;
        v.x -= rest * vn * nx;
        v.y -= rest * vn * ny;
      }
    }

    // Empurra um ponto pra fora do retângulo do cartão (colisão círculo x
    // AABB). Com reflect=true também espelha a velocidade na normal do
    // contato — usado na física; sem reflect é só correção de posição,
    // usado durante o arrasto (não faz sentido "quicar" a mão do usuário).
    function resolveCard(p, v, reflect) {
      const c = cardRect.current;
      if (!c) return;
      const closestX = clamp(p.x, c.x1, c.x2);
      const closestY = clamp(p.y, c.y1, c.y2);
      const dx = p.x - closestX;
      const dy = p.y - closestY;
      const distSq = dx * dx + dy * dy;
      if (distSq >= radius * radius) return;
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        // caso normal: bola tocando a borda de fora, empurra pela normal
        const nx = dx / dist, ny = dy / dist;
        const overlap = radius - dist;
        p.x += nx * overlap;
        p.y += ny * overlap;
        if (reflect && v) reflectVel(v, nx, ny);
        return;
      }
      // Centro caiu em cima ou dentro do retângulo (ex.: um arrasto rápido
      // cujo pointermove "pulou" direto pro meio do cartão) — nesse caso
      // "radius - dist" não basta, tem que sair pela distância real até a
      // borda mais próxima + o raio, senão a bola fica presa lá dentro.
      const dl = p.x - c.x1, dr = c.x2 - p.x, dt = p.y - c.y1, db = c.y2 - p.y;
      const m = Math.min(dl, dr, dt, db);
      let nx = 0, ny = 0;
      if (m === dl) { nx = -1; p.x = c.x1 - radius; }
      else if (m === dr) { nx = 1; p.x = c.x2 + radius; }
      else if (m === dt) { ny = -1; p.y = c.y1 - radius; }
      else { ny = 1; p.y = c.y2 + radius; }
      if (reflect && v) reflectVel(v, nx, ny);
    }

    function measure() {
      const pageRect = zoneEl.getBoundingClientRect();
      dims.current = { width: pageRect.width, height: pageRect.height };
      if (card) {
        const cRect = card.getBoundingClientRect();
        cardRect.current = {
          x1: cRect.left - pageRect.left, y1: cRect.top - pageRect.top,
          x2: cRect.right - pageRect.left, y2: cRect.bottom - pageRect.top,
        };
      }
      goalRect.current = {
        x1: pageRect.width - GOAL_MARGIN - GOAL_W, y1: pageRect.height - GOAL_MARGIN - GOAL_H,
        x2: pageRect.width - GOAL_MARGIN, y2: pageRect.height - GOAL_MARGIN,
      };
      if (pos.current.x === 0 && pos.current.y === 0) {
        pos.current = { x: pageRect.width * 0.15, y: pageRect.height - radius };
      } else {
        clampToPage(pos.current);
        resolveCard(pos.current, null, false);
        clampToPage(pos.current);
      }
      paint();
    }

    function paint() {
      const p = pos.current;
      ball.style.transform = `translate3d(${p.x - radius}px, ${p.y - radius}px, 0) rotate(${rot.current}deg)`;
      if (shadow) {
        const floor = dims.current.height - radius;
        const airborne = Math.max(0, floor - p.y);
        const scale = clamp(1 - airborne / 180, 0.28, 1);
        const opacity = clamp(0.42 - airborne / 320, 0.08, 0.42);
        shadow.style.transform = `translate3d(${p.x - SHADOW_W / 2}px, ${floor + radius - SHADOW_H / 2 + 4}px, 0) scale(${scale})`;
        shadow.style.opacity = String(opacity);
      }
    }

    function squash() {
      ball.classList.remove('pl-ball-squash');
      // força reflow pra permitir reiniciar a mesma animação em quiques seguidos
      void ball.offsetWidth;
      ball.classList.add('pl-ball-squash');
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
          pos.current = { x: width * 0.15, y: height - radius };
          rot.current = 0;
          paint();
        }, 1100);
      }
    }

    function step(t) {
      try {
        stepInner(t);
      } catch (e) {
        window.__pbError = e.message + '\n' + e.stack;
      }
    }
    function stepInner(t) {
      if (!lastT.current) lastT.current = t;
      let dt = (t - lastT.current) / 1000;
      lastT.current = t;
      if (dt > 0.05) dt = 0.05; // evita salto grande depois de aba oculta/travada

      if (!dragging.current && !scored.current) {
        const v = vel.current;
        const p = pos.current;
        const { width, height } = dims.current;
        const floor = height - radius;
        const wasGrounded = p.y >= floor - 0.5;

        v.y += GRAVITY * dt;
        if (!wasGrounded) v.x *= 1 - Math.min(1, AIR_DRAG * dt); // resistência do ar só no voo
        p.x += v.x * dt;
        p.y += v.y * dt;

        // Colisão com o chão só conta se a bola também estiver descendo
        // (v.y >= 0) — no frame logo após um chute ela ainda está em
        // p.y===floor (não teve tempo de sair do lugar) com v.y bem
        // negativo (subindo); sem essa checagem de direção, o quique
        // "aterrissava" na hora e matava o chute antes de decolar.
        if (p.y >= floor && v.y >= 0) {
          p.y = floor;
          const jitter = 1 + (Math.random() - 0.5) * 0.12; // quique nunca é matematicamente idêntico duas vezes
          const bounceSpeed = v.y * RESTITUTION * jitter;
          if (bounceSpeed > 55) { v.y = -bounceSpeed; squash(); } else { v.y = 0; }
          const sign = Math.sign(v.x);
          v.x = Math.max(0, Math.abs(v.x) - FRICTION * dt) * sign;
        }
        if (p.y <= radius) { p.y = radius; v.y = Math.abs(v.y) * RESTITUTION; }
        if (p.x <= radius) { p.x = radius; v.x = Math.abs(v.x) * WALL_RESTITUTION; }
        if (p.x >= width - radius) { p.x = width - radius; v.x = -Math.abs(v.x) * WALL_RESTITUTION; }

        const beforeCard = { x: p.x, y: p.y, vx: v.x, vy: v.y };
        resolveCard(p, v, true);
        const afterCard = { x: p.x, y: p.y, vx: v.x, vy: v.y };
        clampToPage(p);
        if ((window.__pbTrace || 0) < 8) {
          window.__pbTrace = (window.__pbTrace || 0) + 1;
          window.__pbLog = (window.__pbLog || []).concat(JSON.stringify({ dt, floor, beforeCard, afterCard, final: { x: p.x, y: p.y } }));
        }

        // rotação fisicamente correta de rolamento: ângulo = distância / raio
        rot.current += (v.x * dt / radius) * ROTATION_DEG_PER_RAD;
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
      window.__pbLog = (window.__pbLog || []).concat('kick() called');
      const dir = Math.random() < 0.5 ? -1 : 1;
      vel.current = { x: dir * (350 + Math.random() * 300), y: -(950 + Math.random() * 350) };
      scored.current = false;
      ensureLoop();
      window.__pbLog.push('after ensureLoop, moving=' + moving.current + ' raf=' + raf.current);
    }
    window.__pbState = () => ({
      pos: { ...pos.current }, vel: { ...vel.current }, moving: moving.current, raf: raf.current,
      dragging: dragging.current, scored: scored.current, hidden: document.hidden,
      dims: { ...dims.current }, log: window.__pbLog || [],
    });

    function localFromClient(clientX, clientY) {
      const rect = zoneEl.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function onPointerMove(e) {
      if (!dragging.current) return;
      const local = localFromClient(e.clientX, e.clientY);
      pos.current.x = local.x;
      pos.current.y = local.y;
      clampToPage(pos.current);
      resolveCard(pos.current, null, false); // não deixa arrastar pra dentro do cartão
      clampToPage(pos.current);
      const t = agora();
      dragHist.current.push({ x: pos.current.x, y: pos.current.y, t });
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
      // teclado. Por isso ele se limpa sozinho pouco depois também.
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
    if (card) ro.observe(card);
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
  }, [reduced, radius]);

  if (reduced === null) return null; // ainda não sabemos a preferência — não renderiza nada

  const BolaSvg = ({ size }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="pl-ball-shade" cx="36%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="42%" stopColor="#f2f2ee" />
          <stop offset="75%" stopColor="#cfcfc7" />
          <stop offset="100%" stopColor="#9b9b92" />
        </radialGradient>
        <radialGradient id="pl-ball-ao" cx="50%" cy="86%" r="50%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="url(#pl-ball-shade)" stroke="#100f0c" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="47" fill="url(#pl-ball-ao)" />
      <g fill="#131210">
        <path d="M50 29 L62 37.6 L57.3 52 L42.7 52 L38 37.6 Z" />
        <path d="M50 10.5 L58 16.7 L54.7 26 L45.3 26 L42 16.7 Z" opacity="0.95" />
        <path d="M21 33 L30 28.3 L37 36.8 L31.5 47.5 L19.5 45 Z" opacity="0.9" />
        <path d="M79 33 L70 28.3 L63 36.8 L68.5 47.5 L80.5 45 Z" opacity="0.9" />
        <path d="M27 70 L36 63.5 L44.5 69.5 L40.5 80.5 L27.5 80 Z" opacity="0.9" />
        <path d="M73 70 L64 63.5 L55.5 69.5 L59.5 80.5 L72.5 80 Z" opacity="0.9" />
      </g>
      <ellipse cx="34" cy="29" rx="15" ry="9" fill="rgba(255,255,255,0.55)" />
      <ellipse cx="41" cy="23" rx="5" ry="3" fill="rgba(255,255,255,0.9)" />
    </svg>
  );

  if (reduced) {
    // sem física nenhuma: um botão parado, feedback curto (escala) ao tocar,
    // sem qualquer simulação de movimento — só o essencial pedido.
    return (
      <button
        type="button"
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
    <div
      ref={rootRef}
      className="pl-pitch-zone"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' }}
    >
      <div className="pl-pitch-turf" aria-hidden="true" />
      <svg className="pl-pitch-goal" viewBox="0 0 92 72" aria-hidden="true">
        <defs>
          <pattern id="pl-goal-net" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 0L8 8M8 0L0 8" stroke="rgba(243,243,238,0.15)" strokeWidth="1" />
          </pattern>
          <linearGradient id="pl-goal-post" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(243,243,238,0.2)" />
            <stop offset="50%" stopColor="rgba(243,243,238,0.6)" />
            <stop offset="100%" stopColor="rgba(243,243,238,0.2)" />
          </linearGradient>
        </defs>
        <ellipse cx="46" cy="70" rx="42" ry="5" fill="rgba(0,0,0,0.4)" />
        <rect x="8" y="4" width="76" height="64" fill="url(#pl-goal-net)" />
        <path d="M7 68V9a5 5 0 0 1 5-5h68a5 5 0 0 1 5 5v59" fill="none" stroke="url(#pl-goal-post)" strokeWidth="5" strokeLinecap="round" />
      </svg>
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
  );
}
