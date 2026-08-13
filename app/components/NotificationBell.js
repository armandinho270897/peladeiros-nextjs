'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from './AuthProvider';

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
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotificacoes(data || []);
  }, [supabase, user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function toggleOpen() {
    const abrindo = !open;
    setOpen(abrindo);
    if (abrindo) {
      const naoLidasIds = notificacoes.filter((n) => !n.lida).map((n) => n.id);
      if (naoLidasIds.length > 0) {
        setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
        await supabase.from('notificacoes').update({ lida: true }).eq('user_id', user.id).eq('lida', false);
      }
    }
  }

  if (!user) return null;

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const isBottomNav = variant === 'bottomnav';

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {isBottomNav ? (
        <button className="pl-bottom-nav-item" onClick={toggleOpen} aria-label="Notificações">
          <span className="pl-bottom-nav-icon">
            🔔
            {naoLidas > 0 && <span className="pl-bell-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
          </span>
          Avisos
        </button>
      ) : (
        <button className="pl-bell-btn" onClick={toggleOpen} aria-label="Notificações">
          🔔
          {naoLidas > 0 && <span className="pl-bell-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
        </button>
      )}

      {open && (
        <div className={`pl-bell-panel ${isBottomNav ? 'upward' : ''}`}>
          <div className="pl-bell-panel-title">Notificações</div>
          {notificacoes.length === 0 ? (
            <p style={{ padding: '8px 4px', fontSize: 13, color: 'var(--paper-dim)' }}>Nada por aqui ainda.</p>
          ) : (
            notificacoes.map((n) => {
              const conteudo = (
                <div className={`pl-bell-item ${n.lida ? '' : 'unread'}`}>
                  <p>{n.mensagem}</p>
                  <span className="pl-bell-time">{tempoRelativo(n.created_at)}</span>
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
