'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from './AuthProvider';
import BellIcon from './BellIcon';
import AvisoFlagIcon from './AvisoFlagIcon';
import { tapFlash, flashClass } from '@/lib/tapFlash';

// Só o ícone + contador de não lidos — o clique navega pra /avisos (página
// de verdade), não abre painel nenhum. Um painel flutuante (dropdown/modal)
// com position:fixed nunca renderizou de forma confiável no Safari do
// iPhone (fixed + transform falha só no passo de pintura, sem erro), e uma
// rota é uma forma bem mais robusta de resolver isso — navegação de
// página é o caminho mais testado que existe na web.
export default function NotificationBell({ variant = 'header' }) {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());
  const [naoLidas, setNaoLidas] = useState(0);
  const iconWrapRef = useRef(null);
  const prevNaoLidasRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('lida', false);
    const total = count || 0;
    setNaoLidas(total);

    // Tremor de 340ms quando um aviso novo chega — só a partir do segundo
    // load (o primeiro só populando o que já existia não deve tremer).
    if (hasLoadedRef.current && total > prevNaoLidasRef.current) {
      flashClass(iconWrapRef.current, 'shake', 400);
    }
    prevNaoLidasRef.current = total;
    hasLoadedRef.current = true;
  }, [supabase, user]);

  useEffect(() => { load(); }, [load]);

  // Sem poll, o contador só atualizava num reload manual.
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

  if (!user) return null;

  const isBottomNav = variant === 'bottomnav';

  if (isBottomNav) {
    return (
      <Link href="/avisos" className="pl-bottom-nav-item pl-bottom-nav-avisos" onClick={tapFlash}>
        <span className="pl-bottom-nav-icon" ref={iconWrapRef}>
          <span className="pl-bottom-nav-flash" aria-hidden="true" />
          <AvisoFlagIcon />
          {naoLidas > 0 && <span className="pl-bell-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
        </span>
        Avisos
      </Link>
    );
  }

  return (
    <Link href="/avisos" className="pl-bell-btn" aria-label="Notificações">
      <BellIcon size={18} />
      {naoLidas > 0 && <span className="pl-bell-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
    </Link>
  );
}
