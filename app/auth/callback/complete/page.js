'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase-browser';
import LoadingBall from '../../../components/LoadingBall';

function CompleteInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [error, setError] = useState(false);

  useEffect(() => {
    const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(raw);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      console.error('[auth/callback/complete] sem access_token/refresh_token no fragmento da URL');
      setError(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        console.error('[auth/callback/complete] setSession falhou:', error.message);
        Sentry.captureException(new Error(`auth/callback/complete setSession falhou: ${error.message}`));
        setError(true);
        return;
      }
      // navegação completa (não router.push) pra garantir que o middleware
      // rode de novo com a sessão já gravada e decida completar-perfil vs home.
      window.location.href = next;
    });
  }, [next]);

  if (error) {
    return (
      <div className="pl-authpage">
        <div className="pl-authcard">
          <div className="pl-brand"><div className="pl-brand-text">PELADEI<span>ROS</span></div></div>
          <h3>Link inválido ou expirado</h3>
          <p className="pl-hint">Pede um link novo pra entrar.</p>
          <Link href="/login" className="pl-ticket" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <span className="pl-ticket-label">Voltar pro login</span>
            <span className="pl-ticket-stub" aria-hidden="true">⚽</span>
          </Link>
        </div>
      </div>
    );
  }

  return <LoadingBall />;
}

export default function CallbackCompletePage() {
  return (
    <Suspense fallback={null}>
      <CompleteInner />
    </Suspense>
  );
}
