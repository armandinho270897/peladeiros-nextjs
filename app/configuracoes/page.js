'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/ToastProvider';
import TicketButton from '../components/TicketButton';
import PasswordField from '../components/PasswordField';
import InstallButton from '../components/InstallButton';
import BackLink from '../components/BackLink';

const TIPOS = [
  { id: 'solicitacao_pendente', label: 'Alguém pediu pra entrar na sua pelada' },
  { id: 'solicitacao_rejeitada', label: 'Sua solicitação foi recusada' },
  { id: 'aprovado_aguardando_confirmacao', label: 'Você foi aprovado (falta confirmar a vaga)' },
  { id: 'vaga_liberada_espera', label: 'Você entrou no banco de reservas' },
  { id: 'vaga_expirada', label: 'Sua vaga expirou por falta de confirmação' },
  { id: 'conflito_horario', label: 'Solicitação cancelada por conflito de horário' },
  { id: 'partida_proxima', label: 'Sua partida está próxima' },
  { id: 'pelada_nova_perto', label: 'Pelada nova no seu bairro' },
];

export default function ConfiguracoesPage() {
  const { profile, loading: authLoading, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState(() => profile?.notif_prefs || {});
  const [saving, setSaving] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  if (authLoading || !profile) {
    return (
      <div>
        <div className="pl-header"><BackLink href="/perfil" /></div>
        <div className="pl-list" style={{ paddingTop: 14 }}><div className="pl-skeleton" style={{ height: 200 }} /></div>
      </div>
    );
  }

  function toggle(tipoId) {
    setPrefs((prev) => ({ ...prev, [tipoId]: prev[tipoId] === false ? true : false }));
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ notif_prefs: prefs }).eq('id', profile.id);
    setSaving(false);
    if (error) { showToast('Não consegui salvar. Tenta de novo.'); return; }
    await refreshProfile();
    showToast('Preferências salvas!');
  }

  // Pra quem entrou por link mágico/Google antes de hoje e nunca teve
  // senha — define uma agora, enquanto a sessão atual ainda tá ativa, sem
  // precisar de e-mail nenhum. updateUser funciona com qualquer sessão
  // válida, não importa como a pessoa logou originalmente.
  async function handleSalvarSenha(e) {
    e.preventDefault();
    setErroSenha('');
    if (novaSenha.length < 6) { setErroSenha('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (novaSenha !== confirmarSenha) { setErroSenha('As senhas não são iguais.'); return; }
    setSalvandoSenha(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSalvandoSenha(false);
    if (error) { setErroSenha(error.message || 'Não consegui salvar a senha. Tenta de novo.'); return; }
    setNovaSenha('');
    setConfirmarSenha('');
    showToast('Senha definida! Já pode entrar com e-mail e senha da próxima vez.');
  }

  return (
    <div>
      <div className="pl-header">
        <BackLink href="/perfil" />
      </div>

      <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px', fontFamily: 'var(--font-display)', color: 'var(--paper)', textTransform: 'uppercase' }}>
        Notificações
      </div>

      <div style={{ maxWidth: 640, margin: '14px auto 0', padding: '0 16px' }}>
        {TIPOS.map((t) => {
          const ligado = prefs[t.id] !== false;
          return (
            <label key={t.id} className="pl-notif-pref-row">
              <span>{t.label}</span>
              <input type="checkbox" checked={ligado} onChange={() => toggle(t.id)} />
            </label>
          );
        })}

        <div style={{ marginTop: 18 }}>
          <TicketButton onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar preferências'}</TicketButton>
        </div>
      </div>

      <div className="pl-section-title" style={{ maxWidth: 640, margin: '28px auto 0', padding: '0 16px', fontFamily: 'var(--font-display)', color: 'var(--paper)', textTransform: 'uppercase' }}>
        App
      </div>
      <div style={{ maxWidth: 640, margin: '14px auto 0', padding: '0 16px 4px' }}>
        <p style={{ fontSize: 13, color: 'var(--paper-dim)', marginTop: 0 }}>
          Instala o Peladeiros no seu celular pra acessar direto da tela inicial.
        </p>
        <InstallButton />
      </div>

      <div className="pl-section-title" style={{ maxWidth: 640, margin: '28px auto 0', padding: '0 16px', fontFamily: 'var(--font-display)', color: 'var(--paper)', textTransform: 'uppercase' }}>
        Senha
      </div>
      <div style={{ maxWidth: 640, margin: '14px auto 0', padding: '0 16px 24px' }}>
        <p style={{ fontSize: 13, color: 'var(--paper-dim)', marginTop: 0 }}>
          Entrou por link mágico ou Google? Define uma senha aqui pra poder entrar direto com e-mail e senha da próxima vez.
        </p>
        <form onSubmit={handleSalvarSenha}>
          <PasswordField label="Nova senha" required minLength={6} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" />
          <PasswordField label="Confirmar senha" required minLength={6} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} autoComplete="new-password" />
          {erroSenha && <p className="pl-error">{erroSenha}</p>}
          <TicketButton type="submit" disabled={salvandoSenha}>{salvandoSenha ? 'Salvando...' : 'Definir senha'}</TicketButton>
        </form>
      </div>
    </div>
  );
}
