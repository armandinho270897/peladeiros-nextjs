'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
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
    // Este componente fica montado no layout raiz e não desmonta ao
    // navegar pra /avisos (navegação client-side, sem focus/visibilitychange
    // próprios) — sem isso o contador ficava com o número antigo até o
    // próximo poll de 30s mesmo já tendo marcado tudo como lido lá.
    window.addEventListener('pl-notificacoes-lidas', load);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('pl-notificacoes-lidas', load);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load]);

  if (!user) return null;

  const isBottomNav = variant === 'bottomnav';

  if (isBottomNav) {
    // Mesma checagem de pathname que os outros itens de BottomNav.js —
    // faltava aqui porque esse item virou um componente à parte
    // (NotificationBell) em vez de um Link direto ali, e ficou pra trás
    // quando /avisos virou rota de verdade (era painel flutuante antes,
    // sem pathname próprio pra comparar). Splat também estava faltando na
    // marcação: sem o span, o CSS de destaque (.active .pl-bottom-nav-splat)
    // não tinha o que estilizar, mesmo com a classe active certa.
    const active = pathname === '/avisos';
    return (
      <Link href="/avisos" className={`pl-bottom-nav-item pl-bottom-nav-avisos ${active ? 'active' : ''}`} onClick={tapFlash}>
        <span className="pl-bottom-nav-icon" ref={iconWrapRef}>
          <span className="pl-bottom-nav-splat" aria-hidden="true" />
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
