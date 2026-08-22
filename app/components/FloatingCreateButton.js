'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

// Botão flutuante de criar pelada — só na Home, só logado. Precisa morar
// no layout raiz (fora de .pl-page-fade, que tem transform e por isso vira
// containing block de position:fixed) pra ficar de fato preso à tela,
// igual à BottomNav. Como a Home já está montada (mesma rota), avisa por
// evento em vez de navegar pra "/?criar=1" (isso não remontaria a página
// nem re-disparia o efeito que a Home usa pra ler a query string).
export default function FloatingCreateButton() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (pathname !== '/') return undefined;
    function onScroll() {
      setCollapsed(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCollapsed(false), 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timerRef.current);
    };
  }, [pathname]);

  if (!user || pathname !== '/') return null;

  return (
    <button
      type="button"
      className={`pl-fab ${collapsed ? 'pl-fab-collapsed' : ''}`}
      onClick={() => window.dispatchEvent(new Event('pl:criar-pelada'))}
      aria-label="Criar pelada"
    >
      <span className="pl-fab-icon" aria-hidden="true">+</span>
      <span className="pl-fab-label">Criar pelada</span>
    </button>
  );
}
