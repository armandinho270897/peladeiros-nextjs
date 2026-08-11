'use client';
import { useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import TicketButton from '../components/TicketButton';

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) { setError('Não consegui enviar o link. Confere o e-mail e tenta de novo.'); return; }
    setSent(true);
  }

  return (
    <div className="pl-authpage">
      <div className="pl-authcard">
        <div className="pl-brand"><div className="pl-brand-text">PELADEI<span>ROS</span></div></div>
        <p className="pl-tagline">achou o campo, chamou o povo, bateu bola</p>

        {sent ? (
          <>
            <h3>Confere seu e-mail</h3>
            <p className="pl-hint">Te mandamos um link pra entrar em <b>{email}</b>. Clica nele pra continuar — pode fechar essa aba.</p>
          </>
        ) : (
          <>
            <h3>Entrar</h3>
            <p className="pl-hint">Sem senha — a gente manda um link mágico no seu e-mail.</p>
            <form onSubmit={handleSubmit}>
              <div className="pl-field">
                <label>E-mail</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
              </div>
              {error && <p className="pl-error">{error}</p>}
              <TicketButton type="submit" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Enviando...' : 'Entrar'}
              </TicketButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
