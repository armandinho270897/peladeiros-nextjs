'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from './AuthProvider';

export default function EditProfileModal({ onClose, onSaved }) {
  const { user, profile, refreshProfile } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const f = e.target;
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        nome: f.nome.value.trim(),
        whatsapp: f.whatsapp.value.trim(),
        bairro: f.bairro.value.trim() || null,
      })
      .eq('id', user.id);
    setLoading(false);
    if (error) { setError('Não consegui salvar. Tenta de novo.'); return; }
    await refreshProfile();
    onSaved();
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Editar perfil</h3>
        <form onSubmit={handleSubmit}>
          <div className="pl-field"><label>Nome</label><input name="nome" defaultValue={profile?.nome} required /></div>
          <div className="pl-field"><label>WhatsApp</label><input name="whatsapp" defaultValue={profile?.whatsapp} required /></div>
          <div className="pl-field"><label>Bairro (opcional)</label><input name="bairro" defaultValue={profile?.bairro || ''} /></div>
          {error && <p className="pl-error">{error}</p>}
          <div className="pl-modal-actions">
            <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="pl-btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
