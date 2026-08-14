'use client';
import { useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import TicketButton from '../components/TicketButton';

// Traduz os erros mais comuns do supabase-js pra mensagem em português —
// o resto (raro) cai no fallback genérico, mas nunca fica sem feedback.
function traduzErroSenha(error) {
  const msg = error?.message || '';
  if (msg.includes('already registered') || msg.includes('already exists')) return 'Esse e-mail já tem conta. Tenta entrar em vez de criar.';
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha errados.';
  if (msg.includes('Password should be at least') || msg.includes('at least 6')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (msg.includes('Unable to validate email')) return 'Esse e-mail não parece válido.';
  return msg || 'Não consegui completar. Tenta de novo.';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const authError = searchParams.get('authError');
  const [modo, setModo] = useState('magico'); // 'magico' | 'senha'
  const [criandoConta, setCriandoConta] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(authError ? 'O link expirou ou já foi usado. Pede um novo abaixo.' : '');
  const [loading, setLoading] = useState(false);

  async function handleSubmitMagico(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Rota própria (Resend, via API HTTP) em vez de supabase.auth.signInWithOtp
    // — o e-mail nativo do Supabase trava em 2/hora no plano gratuito.
    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), next }),
    });
    const result = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(result.error || 'Não consegui enviar o link. Confere o e-mail e tenta de novo.'); return; }
    setSent(true);
  }

  async function handleSubmitSenha(e) {
    e.preventDefault();
    setError('');

    if (criandoConta) {
      if (senha.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return; }
      if (senha !== confirmarSenha) { setError('As senhas não são iguais.'); return; }
    }

    setLoading(true);
    const supabase = createClient();

    if (criandoConta) {
      // Sem confirmação por e-mail (desligada no painel do Supabase) — a
      // conta já vem com sessão ativa, sem depender de nenhum envio.
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha });
      setLoading(false);
      if (error) { setError(traduzErroSenha(error)); return; }
      if (!data.session) {
        setError('Conta criada, mas ainda precisa confirmar por e-mail antes de entrar.');
        return;
      }
      router.push(next);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setLoading(false);
    if (error) { setError(traduzErroSenha(error)); return; }
    router.push(next);
  }

  async function handleGoogle() {
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setError('Não consegui iniciar o login com Google. Tenta de novo.');
  }

  function trocarModo(novoModo) {
    setModo(novoModo);
    setError('');
    setSenha('');
    setConfirmarSenha('');
  }

  return (
    <div className="pl-authpage">
      <div className="pl-authcard">
        <div className="pl-brand"><div className="pl-brand-text">PELADEI<span>ROS</span></div></div>
        <p className="pl-tagline">Vem pro fut, vem.</p>

        {sent ? (
          <>
            <h3>Confere seu e-mail</h3>
            <p className="pl-hint">Te mandamos um link pra entrar em <b>{email}</b>. Clica nele pra continuar — pode fechar essa aba.</p>
          </>
        ) : (
          <>
            <h3>Entrar</h3>

            <div className="pl-tabs" style={{ margin: '0 0 16px', padding: 0, maxWidth: 'none' }}>
              <button type="button" className={`pl-tab ${modo === 'magico' ? 'active' : ''}`} onClick={() => trocarModo('magico')}>Link mágico</button>
              <button type="button" className={`pl-tab ${modo === 'senha' ? 'active' : ''}`} onClick={() => trocarModo('senha')}>Com senha</button>
            </div>

            {modo === 'magico' ? (
              <>
                <p className="pl-hint">Sem senha — a gente manda um link mágico no seu e-mail.</p>
                <form onSubmit={handleSubmitMagico}>
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
            ) : (
              <>
                <p className="pl-hint">{criandoConta ? 'Cria sua conta com e-mail e senha — sem precisar confirmar por e-mail.' : 'Entra direto com e-mail e senha.'}</p>
                <form onSubmit={handleSubmitSenha}>
                  <div className="pl-field">
                    <label>E-mail</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
                  </div>
                  <div className="pl-field">
                    <label>Senha</label>
                    <input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••" />
                  </div>
                  {criandoConta && (
                    <div className="pl-field">
                      <label>Confirmar senha</label>
                      <input type="password" required minLength={6} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="••••••" />
                    </div>
                  )}
                  {error && <p className="pl-error">{error}</p>}
                  <TicketButton type="submit" style={{ width: '100%' }} disabled={loading}>
                    {loading ? (criandoConta ? 'Criando...' : 'Entrando...') : (criandoConta ? 'Criar conta' : 'Entrar')}
                  </TicketButton>
                </form>
                <button type="button" className="pl-link-muted" style={{ display: 'block', marginTop: 12 }} onClick={() => { setCriandoConta((v) => !v); setError(''); }}>
                  {criandoConta ? 'Já tem conta? Entrar' : 'Não tem conta? Criar uma'}
                </button>
              </>
            )}

            <div className="pl-authpage-divider"><span>ou</span></div>
            <button type="button" className="pl-btn-secondary" style={{ width: '100%' }} onClick={handleGoogle}>
              Entrar com Google
            </button>
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
