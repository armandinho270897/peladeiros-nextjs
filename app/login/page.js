'use client';
import { useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase-browser';
import { createRecoveryClient } from '@/lib/supabase-recovery';
import TicketButton from '../components/TicketButton';
import PasswordField from '../components/PasswordField';
import Brand from '../components/Brand';

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

// Login com e-mail + senha, único método — sem link mágico (dependia do
// limite de envio de e-mail) e sem Google (config incompleta). Sessões já
// ativas de quem entrou por esses métodos antes continuam valendo; quem
// precisar logar de novo define uma senha em Perfil > Configurações.
function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const authError = searchParams.get('authError');
  const redefinida = searchParams.get('redefinida');
  const [modo, setModo] = useState('entrar'); // 'entrar' | 'criar' | 'esqueci'
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState(
    authError ? 'Sua sessão expirou. Entra de novo abaixo.' : redefinida ? 'Senha redefinida! Entra com a senha nova.' : ''
  );
  const [credenciaisInvalidas, setCredenciaisInvalidas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCredenciaisInvalidas(false);

    if (modo === 'criar') {
      if (senha.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return; }
      if (senha !== confirmarSenha) { setError('As senhas não são iguais.'); return; }
    }

    setLoading(true);
    const supabase = createClient();

    if (modo === 'criar') {
      // Sem confirmação por e-mail (desligada no painel do Supabase) — a
      // conta já vem com sessão ativa, sem depender de nenhum envio.
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha });
      if (error) { setLoading(false); setError(traduzErroSenha(error)); return; }
      if (!data.session) {
        setLoading(false);
        setError('Conta criada, mas ainda precisa confirmar por e-mail antes de entrar.');
        return;
      }
      // Navegação completa (não router.push) — o router cache do Next às
      // vezes serve uma versão de "/" que ainda não viu a sessão nova.
      window.location.href = next;
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setLoading(false);
      setError(traduzErroSenha(error));
      // A Supabase não distingue "e-mail não existe" de "senha errada" (evita
      // vazar quais e-mails têm conta) — em vez de adivinhar, oferece o
      // caminho de criar conta junto do erro, pra quem só ainda não se cadastrou.
      if ((error.message || '').includes('Invalid login credentials')) setCredenciaisInvalidas(true);
      return;
    }
    window.location.href = next;
  }

  async function handleEsqueciSenha(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Cliente à parte (flowType implicit, ver lib/supabase-recovery.js) —
    // PKCE guarda a code_verifier só no navegador que pediu a redefinição,
    // então o link falha se aberto em outro navegador/aparelho (comum:
    // navegador embutido do Instagram, outro celular). Implicit entrega a
    // sessão dentro do próprio link, funciona em qualquer lugar que abrir.
    const supabase = createRecoveryClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    setLoading(false);
    if (error) {
      Sentry.captureException(new Error(`resetPasswordForEmail falhou: ${error.message}`));
      setError('Não conseguimos enviar agora. Tenta de novo em alguns minutos.');
      return;
    }
    setPedidoEnviado(true);
  }

  function trocarModo(novoModo) {
    setModo(novoModo);
    setError('');
    setCredenciaisInvalidas(false);
    setSenha('');
    setConfirmarSenha('');
    setPedidoEnviado(false);
  }

  if (modo === 'esqueci') {
    return (
      <div className="pl-authpage">
        <div className="pl-authcard">
          <Brand />
          <p className="pl-tagline">Vem pro fut, vem.</p>

          {pedidoEnviado ? (
            <>
              <h3 style={{ marginBottom: 6 }}>Verifica seu e-mail</h3>
              <p className="pl-hint">Se {email.trim()} tiver uma conta, mandamos um link pra redefinir a senha.</p>
              <TicketButton type="button" style={{ width: '100%', marginTop: 8 }} onClick={() => trocarModo('entrar')}>Voltar pro login</TicketButton>
            </>
          ) : (
            <>
              <p className="pl-hint">Esqueceu a senha? Manda seu e-mail que a gente envia um link pra redefinir.</p>
              <form onSubmit={handleEsqueciSenha}>
                <div className="pl-field">
                  <label>E-mail</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
                </div>
                {error && <p className="pl-error">{error}</p>}
                <TicketButton type="submit" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar link'}
                </TicketButton>
              </form>
              <button type="button" className="pl-share-btn" style={{ marginTop: 10 }} onClick={() => trocarModo('entrar')}>Voltar pro login</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pl-authpage">
      <div className="pl-authcard">
        <Brand />
        <p className="pl-tagline">Vem pro fut, vem.</p>

        <div className="pl-tabs" style={{ margin: '16px 0', padding: 0, maxWidth: 'none' }}>
          <button type="button" className={`pl-tab ${modo === 'entrar' ? 'active' : ''}`} onClick={() => trocarModo('entrar')}>Entrar</button>
          <button type="button" className={`pl-tab ${modo === 'criar' ? 'active' : ''}`} onClick={() => trocarModo('criar')}>Criar conta</button>
        </div>

        <p className="pl-hint">{modo === 'criar' ? 'Cria sua conta com e-mail e senha.' : 'Entra com seu e-mail e senha.'}</p>
        <form onSubmit={handleSubmit}>
          <div className="pl-field">
            <label>E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </div>
          <PasswordField label="Senha" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} />
          {modo === 'criar' && (
            <PasswordField label="Confirmar senha" required minLength={6} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} autoComplete="new-password" />
          )}
          {modo === 'entrar' && (
            <button type="button" className="pl-share-btn" style={{ marginTop: -4 }} onClick={() => trocarModo('esqueci')}>Esqueci minha senha</button>
          )}
          {error && <p className="pl-error">{error}</p>}
          {credenciaisInvalidas && (
            <p className="pl-hint" style={{ marginTop: -6 }}>
              Ainda não tem conta?{' '}
              <button type="button" className="pl-inline-link" onClick={() => trocarModo('criar')}>Criar conta</button>
            </p>
          )}
          <TicketButton type="submit" style={{ width: '100%' }} disabled={loading}>
            {loading ? (modo === 'criar' ? 'Criando...' : 'Entrando...') : (modo === 'criar' ? 'Criar conta' : 'Entrar')}
          </TicketButton>
        </form>
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
