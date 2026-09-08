'use client';
import { useState } from 'react';
import TicketButton from './TicketButton';
import Avatar from './Avatar';
import { MODALIDADES } from '@/lib/gameUtils';
import { DIAS_SEMANA, RECRUTAMENTO_OPCOES } from '@/lib/timeConstants';
import { useArenas } from '@/lib/useArenas';

export default function NewTimeModal({ onClose, onCreated }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [escudoFile, setEscudoFile] = useState(null);
  const [escudoPreview, setEscudoPreview] = useState(null);
  const { arenas } = useArenas();

  function handleEscudoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEscudoFile(file);
    setEscudoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const f = e.target;
    const nome = f.nome.value.trim();
    if (!nome) { setError('Dá um nome pro time.'); return; }

    setLoading(true);
    const form = new FormData();
    form.set('nome', nome);
    form.set('bairro', f.bairro.value.trim());
    form.set('modalidade', f.modalidade.value);
    form.set('sigla', f.sigla.value.trim());
    form.set('tecnico', f.tecnico.value.trim());
    form.set('arenaId', f.arenaId.value);
    form.set('diaJogo', f.diaJogo.value);
    form.set('horarioJogo', f.horarioJogo.value);
    form.set('maxJogadores', f.maxJogadores.value);
    form.set('recrutamento', f.recrutamento.value);
    if (escudoFile) form.set('escudo', escudoFile);

    const res = await fetch('/api/times', { method: 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(json.error || 'Não consegui criar o time. Tenta de novo.'); return; }
    onCreated(json);
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Criar time</h3>
        <form onSubmit={handleSubmit}>
          <div className="pl-field" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar nome="" size={64} fotoUrl={escudoPreview} />
            <div>
              <label htmlFor="escudo-input" className="pl-share-btn" style={{ cursor: 'pointer' }}>
                {escudoPreview ? 'Trocar escudo' : 'Adicionar escudo (opcional)'}
              </label>
              <input id="escudo-input" type="file" accept="image/*" onChange={handleEscudoChange} style={{ display: 'none' }} />
            </div>
          </div>
          <div className="pl-field"><label>Nome do time</label><input name="nome" required /></div>
          <div className="pl-field"><label>Sigla (opcional)</label><input name="sigla" maxLength={5} placeholder="Ex: FCP" /></div>

          <div className="pl-field"><label>Bairro (opcional)</label><input name="bairro" /></div>
          {arenas.length > 0 && (
            <div className="pl-field">
              <label>Arena principal (opcional)</label>
              <select className="pl-select" name="arenaId" style={{ width: '100%' }}>
                <option value="">Não informar</option>
                {arenas.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.bairro})</option>)}
              </select>
            </div>
          )}
          <div className="pl-field">
            <label>Modalidade principal (opcional)</label>
            <select className="pl-select" name="modalidade" style={{ width: '100%' }}>
              <option value="">Não informar</option>
              {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="pl-field"><label>Técnico (opcional)</label><input name="tecnico" /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="pl-field" style={{ flex: 1 }}>
              <label>Dia fixo de jogo (opcional)</label>
              <select className="pl-select" name="diaJogo" style={{ width: '100%' }}>
                <option value="">Não informar</option>
                {DIAS_SEMANA.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="pl-field" style={{ flex: 1 }}>
              <label>Horário (opcional)</label>
              <input name="horarioJogo" type="time" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div className="pl-field" style={{ flex: 1 }}>
              <label>Limite de elenco</label>
              <input name="maxJogadores" type="number" min={1} max={99} defaultValue={15} />
            </div>
            <div className="pl-field" style={{ flex: 1 }}>
              <label>Recrutamento</label>
              <select className="pl-select" name="recrutamento" style={{ width: '100%' }} defaultValue="fechado">
                {RECRUTAMENTO_OPCOES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="pl-error">{error}</p>}
          <div className="pl-modal-actions">
            <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
            <TicketButton type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar time'}</TicketButton>
          </div>
        </form>
      </div>
    </div>
  );
}
