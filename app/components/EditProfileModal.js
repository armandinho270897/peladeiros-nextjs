'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from './AuthProvider';
import Avatar from './Avatar';
import TicketButton from './TicketButton';
import { MODALIDADES, POSICOES_POR_MODALIDADE, POSICAO_LABEL } from '@/lib/gameUtils';

export default function EditProfileModal({ onClose, onSaved }) {
  const { user, profile, refreshProfile } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(profile?.foto_url || null);
  const [modalidade, setModalidade] = useState(profile?.modalidade_principal || '');
  const [posicoes, setPosicoes] = useState(profile?.posicoes || []);

  function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  function handleModalidadeChange(e) {
    setModalidade(e.target.value);
    // troca de modalidade invalida as posições escolhidas antes (podiam
    // ser de outro esporte, ex: "fixo" de futsal não existe em campo)
    setPosicoes([]);
  }

  function togglePosicao(slug) {
    setPosicoes((prev) => {
      if (prev.includes(slug)) return prev.filter((p) => p !== slug);
      if (prev.length >= 2) return prev;
      return [...prev, slug];
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (modalidade && posicoes.length === 0) {
      setError('Escolhe pelo menos 1 posição pra essa modalidade.');
      return;
    }

    setLoading(true);
    const f = e.target;
    const supabase = createClient();

    let fotoUrl = profile?.foto_url || null;
    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop() || 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, fotoFile, { upsert: true });
      if (uploadError) { setError('Não consegui enviar a foto. Tenta de novo.'); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      fotoUrl = `${urlData.publicUrl}?t=${Date.now()}`; // cache-bust: mesmo caminho é reaproveitado a cada troca de foto
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        nome: f.nome.value.trim(),
        whatsapp: f.whatsapp.value.trim(),
        bairro: f.bairro.value.trim() || null,
        modalidade_principal: modalidade || null,
        posicoes: modalidade ? posicoes : null,
        idade: f.idade.value ? parseInt(f.idade.value, 10) : null,
        altura_cm: f.altura.value ? parseInt(f.altura.value, 10) : null,
        peso_kg: f.peso.value ? parseFloat(f.peso.value) : null,
        instagram: f.instagram.value.trim() || null,
        escolinhas: f.escolinhas.value.trim() || null,
        pe_dominante: f.pe_dominante.value || null,
        disponibilidade: f.disponibilidade.value.trim() || null,
        time_coracao: f.time_coracao.value.trim() || null,
        foto_url: fotoUrl,
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
          <div className="pl-field" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar nome={profile?.nome || ''} size={64} fotoUrl={fotoPreview} />
            <div>
              <label htmlFor="foto-input" className="pl-share-btn" style={{ cursor: 'pointer' }}>Trocar foto</label>
              <input id="foto-input" type="file" accept="image/*" onChange={handleFotoChange} style={{ display: 'none' }} />
            </div>
          </div>
          <div className="pl-field"><label>Nome</label><input name="nome" defaultValue={profile?.nome} required /></div>
          <div className="pl-field"><label>WhatsApp</label><input name="whatsapp" defaultValue={profile?.whatsapp} required /></div>
          <div className="pl-field"><label>Bairro (opcional)</label><input name="bairro" defaultValue={profile?.bairro || ''} /></div>
          <div className="pl-field">
            <label>Modalidade principal (opcional)</label>
            <select className="pl-select" value={modalidade} onChange={handleModalidadeChange} style={{ width: '100%' }}>
              <option value="">Não informar</option>
              {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {modalidade && (
            <div className="pl-field">
              <label>Posições (escolha 1 ou 2)</label>
              {POSICOES_POR_MODALIDADE[modalidade].map(({ categoria, opcoes }) => (
                <div key={categoria} className="pl-posicoes-categoria">
                  <span className="pl-posicoes-categoria-label">{categoria}</span>
                  <div className="pl-posicoes-chips">
                    {opcoes.map((slug) => {
                      const selecionada = posicoes.includes(slug);
                      const desabilitada = !selecionada && posicoes.length >= 2;
                      return (
                        <button
                          key={slug}
                          type="button"
                          className={`pl-chip ${selecionada ? 'active' : ''}`}
                          disabled={desabilitada}
                          style={desabilitada ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                          onClick={() => togglePosicao(slug)}
                        >
                          {POSICAO_LABEL[slug]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="pl-field">
            <label>Pé dominante (opcional)</label>
            <select className="pl-select" name="pe_dominante" defaultValue={profile?.pe_dominante || ''} style={{ width: '100%' }}>
              <option value="">Não informar</option>
              <option value="destro">Destro</option>
              <option value="canhoto">Canhoto</option>
              <option value="ambidestro">Ambidestro</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="pl-field" style={{ flex: 1 }}><label>Idade (opcional)</label><input name="idade" type="number" min="1" max="120" defaultValue={profile?.idade || ''} /></div>
            <div className="pl-field" style={{ flex: 1 }}><label>Altura em cm (opcional)</label><input name="altura" type="number" min="1" max="260" defaultValue={profile?.altura_cm || ''} /></div>
            <div className="pl-field" style={{ flex: 1 }}><label>Peso em kg (opcional)</label><input name="peso" type="number" min="1" max="300" step="0.1" defaultValue={profile?.peso_kg || ''} /></div>
          </div>
          <div className="pl-field"><label>Instagram (opcional)</label><input name="instagram" placeholder="@seu_usuario" defaultValue={profile?.instagram || ''} /></div>
          <div className="pl-field"><label>Escolinhas (opcional)</label><input name="escolinhas" placeholder="Onde você já jogou/treinou" defaultValue={profile?.escolinhas || ''} /></div>
          <div className="pl-field"><label>Disponibilidade (opcional)</label><input name="disponibilidade" placeholder="Ex: fins de semana à noite" defaultValue={profile?.disponibilidade || ''} /></div>
          <div className="pl-field"><label>Time do coração (opcional)</label><input name="time_coracao" placeholder="Ex: Flamengo" defaultValue={profile?.time_coracao || ''} /></div>
          {error && <p className="pl-error">{error}</p>}
          <div className="pl-modal-actions">
            <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
            <TicketButton type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</TicketButton>
          </div>
        </form>
      </div>
    </div>
  );
}
