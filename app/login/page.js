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

// Login com e-mail + senha, único método — sem link mágico (dependia do
// limite de envio de e-mail) e sem Google (config incompleta). Sessões já
// ativas de quem entrou por esses métodos antes continuam valendo; quem
// precisar logar de novo define uma senha em Perfil > Configurações.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const authError = searchParams.get('authError');
  const [criandoConta, setCriandoConta] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState(authError ? 'Sua sessão expirou. Entra de novo abaixo.' : '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
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
    if (error) { setLoading(false); setError(traduzErroSenha(error)); return; }
    window.location.href = next;
  }

  function trocarModo(criar) {
    setCriandoConta(criar);
    setError('');
    setSenha('');
    setConfirmarSenha('');
  }

  return (
    <div className="pl-authpage">
      <div className="pl-authcard">
        <div className="pl-brand"><div className="pl-brand-text">PELADEI<span>ROS</span></div></div>
        <p className="pl-tagline">Vem pro fut, vem.</p>

        <div className="pl-tabs" style={{ margin: '16px 0', padding: 0, maxWidth: 'none' }}>
          <button type="button" className={`pl-tab ${!criandoConta ? 'active' : ''}`} onClick={() => trocarModo(false)}>Entrar</button>
          <button type="button" className={`pl-tab ${criandoConta ? 'active' : ''}`} onClick={() => trocarModo(true)}>Criar conta</button>
        </div>

        <p className="pl-hint">{criandoConta ? 'Cria sua conta com e-mail e senha.' : 'Entra com seu e-mail e senha.'}</p>
        <form onSubmit={handleSubmit}>
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
