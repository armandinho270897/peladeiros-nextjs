'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import TicketButton from '../components/TicketButton';
import PasswordField from '../components/PasswordField';
import Brand from '../components/Brand';
import NightPitchBackground from '../components/NightPitchBackground';
import PitchBall from '../components/PitchBall';
import BtnBall from '../components/BtnBall';

// Chega aqui só depois do link de "esqueci minha senha" já ter passado por
// /auth/callback/complete e ativado a sessão (o middleware barra quem não
// tiver sessão válida, então não precisa checar de novo aqui). Depois de
// trocar a senha, desloga e manda pro login — força usar a senha nova já
// na próxima entrada, em vez de deixar a sessão antiga solta.
export default function RedefinirSenhaPage() {
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (senha.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (senha !== confirmarSenha) { setError('As senhas não são iguais.'); return; }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setLoading(false);
      setError(error.message || 'Não consegui salvar a senha. Tenta de novo.');
      return;
    }
    await supabase.auth.signOut();
    window.location.href = '/login?redefinida=1';
  }

  return (
    <div className="pl-authpage">
      <NightPitchBackground />
      <PitchBall />
      <div className="pl-authcard">
        <div className="pl-stagger-1"><Brand /></div>
        <p className="pl-tagline pl-stagger-2">Vem pro fut, vem.</p>

        <div className="pl-stagger-3">
          <h3 style={{ marginBottom: 6 }}>Escolhe uma senha nova</h3>
          <p className="pl-hint">Depois de salvar, entra de novo com ela.</p>
          <form onSubmit={handleSubmit}>
            <PasswordField floating label="Nova senha" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
            <PasswordField floating label="Confirmar senha" required minLength={6} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} autoComplete="new-password" />
            {error && <p className="pl-error">{error}</p>}
            <TicketButton type="submit" style={{ width: '100%' }} disabled={loading}>
              {loading ? <BtnBall /> : 'Salvar senha nova'}
            </TicketButton>
          </form>
        </div>
      </div>
    </div>
  );
}
