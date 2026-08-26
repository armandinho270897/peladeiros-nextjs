'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from './AuthProvider';
import BellIcon from './BellIcon';
import AvisoFlagIcon from './AvisoFlagIcon';
import Avatar from './Avatar';
import BolaParadaIcon from './BolaParadaIcon';
import { tapFlash, flashClass } from '@/lib/tapFlash';

function tempoRelativo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export default function NotificationBell({ variant = 'header' }) {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());
  const [notificacoes, setNotificacoes] = useState([]);
  const [atores, setAtores] = useState({});
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const iconWrapRef = useRef(null);
  const prevNaoLidasRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    const rows = data || [];
    setNotificacoes(rows);

    // Tremor de 340ms quando um aviso novo chega — decidido aqui dentro
    // (não num useEffect reagindo a naoLidas) pra não confundir "primeiro
    // load populando os avisos que já existiam" com "aviso novo chegou":
    // só treme a partir do segundo load em diante.
    const naoLidasAgora = rows.filter((n) => !n.lida).length;
    if (hasLoadedRef.current && naoLidasAgora > prevNaoLidasRef.current) {
      flashClass(iconWrapRef.current, 'shake', 400);
    }
    prevNaoLidasRef.current = naoLidasAgora;
    hasLoadedRef.current = true;

    // busca separada (não dá pra embedar via FK — ator_user_id referencia
    // auth.users, não profiles) só pra quem tem foto/nome pra mostrar.
    const atorIds = [...new Set(rows.map((n) => n.ator_user_id).filter(Boolean))];
    if (atorIds.length > 0) {
      const { data: perfis } = await supabase.from('profiles').select('id, nome, foto_url').in('id', atorIds);
      setAtores(Object.fromEntries((perfis || []).map((p) => [p.id, p])));
    }
  }, [supabase, user]);

  useEffect(() => { load(); }, [load]);

  // Sem poll, o sininho só atualizava num reload manual — quem tava com a
  // aba aberta esperando uma aprovação não via o aviso chegar.
  useEffect(() => {
    const interval = setInterval(load, 30000);
    function onVisible() {
      if (document.visibilityState === 'visible') load();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Diagnóstico temporário (ver toggleOpen) — confirma se o painel chegou a
  // montar de verdade e onde ele calculou a própria posição, depois do
  // layout assentar. Remover junto com o resto da instrumentação.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) {
        Sentry.captureMessage('Avisos: open=true mas panelRef não montou', 'warning');
        return;
      }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      Sentry.captureMessage(
        `Avisos painel montado: rect=${JSON.stringify({ x: r.x, y: r.y, w: r.width, h: r.height })} display=${cs.display} visibility=${cs.visibility} opacity=${cs.opacity} zIndex=${cs.zIndex}`,
        'info'
      );
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  async function toggleOpen() {
    const abrindo = !open;
    // Diagnóstico temporário — o painel não aparece em pelo menos um
    // usuário real (Android e iPhone), mas nenhum teste sintético reproduz
    // e o Sentry não capturou exceção nenhuma. Precisa saber se o handler
    // dispara de verdade e com que estado/viewport, já que "nada acontece"
    // sem erro nenhum é o próprio sintoma. Remover depois de diagnosticado.
    Sentry.captureMessage(`Avisos clicado: abrindo=${abrindo} innerWidth=${window.innerWidth} innerHeight=${window.innerHeight} ua=${navigator.userAgent}`, 'info');
    setOpen(abrindo);
    if (abrindo) {
      const naoLidasIds = notificacoes.filter((n) => !n.lida).map((n) => n.id);
      if (naoLidasIds.length > 0) {
        setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
        // sem isso, prevNaoLidasRef fica travado no valor de antes de abrir
        // o painel e um aviso genuinamente novo logo em seguida não tremeria
        // (a comparação em load() ia achar que ainda não subiu).
        prevNaoLidasRef.current = 0;
        const { error: lidaError } = await supabase.from('notificacoes').update({ lida: true }).eq('user_id', user.id).eq('lida', false);
        if (lidaError) Sentry.captureException(lidaError);
      }
    }
  }

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  if (!user) return null;

  const isBottomNav = variant === 'bottomnav';

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {isBottomNav ? (
        <button
          className="pl-bottom-nav-item pl-bottom-nav-avisos"
          onClick={(e) => { tapFlash(e); toggleOpen(); }}
          aria-label="Notificações"
        >
          <span className="pl-bottom-nav-icon" ref={iconWrapRef}>
            <span className="pl-bottom-nav-flash" aria-hidden="true" />
            <AvisoFlagIcon />
            {naoLidas > 0 && <span className="pl-bell-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
          </span>
          Avisos
        </button>
      ) : (
        <button className="pl-bell-btn" onClick={toggleOpen} aria-label="Notificações">
          <BellIcon size={18} />
          {naoLidas > 0 && <span className="pl-bell-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
        </button>
      )}

      {open && isBottomNav && <div className="pl-bell-backdrop" onClick={() => setOpen(false)} />}
      {open && (
        <div ref={panelRef} className={`pl-bell-panel ${isBottomNav ? 'upward' : ''}`}>
          <div className="pl-bell-panel-title">Notificações</div>
          {notificacoes.length === 0 ? (
            <div style={{ padding: '10px 4px', textAlign: 'center' }}>
              <BolaParadaIcon width={56} />
              <p style={{ fontSize: 13, color: 'var(--paper-dim)', margin: '6px 0 0' }}>Nada por aqui ainda 👀</p>
            </div>
          ) : (
            notificacoes.map((n) => {
              const ator = n.ator_user_id ? atores[n.ator_user_id] : null;
              const conteudo = (
                <div className={`pl-bell-item ${n.lida ? '' : 'unread'}`}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {ator && <Avatar nome={ator.nome} fotoUrl={ator.foto_url} size={26} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p>{n.mensagem}</p>
                      <span className="pl-bell-time">{tempoRelativo(n.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
              return n.game_id ? (
                <Link key={n.id} href={`/pelada/${n.game_id}`} className="pl-bell-item-link" onClick={() => setOpen(false)}>
                  {conteudo}
                </Link>
              ) : (
                <div key={n.id}>{conteudo}</div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
