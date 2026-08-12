'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/ToastProvider';
import TicketButton from '../components/TicketButton';

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

  if (authLoading || !profile) {
    return (
      <div>
        <div className="pl-header"><Link href="/perfil" style={{ color: 'var(--neon)', fontSize: 13, textDecoration: 'none' }}>&larr; Voltar</Link></div>
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

  return (
    <div>
      <div className="pl-header">
        <Link href="/perfil" style={{ color: 'var(--neon)', fontSize: 13, textDecoration: 'none' }}>&larr; Voltar</Link>
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
    </div>
  );
}
