'use client';
import { useState } from 'react';

const MOTIVOS = [
  { id: 'comportamento_abusivo', label: 'Comportamento abusivo' },
  { id: 'no_show_recorrente', label: 'No-show recorrente' },
  { id: 'informacao_falsa', label: 'Informação falsa' },
  { id: 'conteudo_inadequado', label: 'Conteúdo inadequado' },
  { id: 'problema_seguranca', label: 'Problema de segurança' },
  { id: 'outro', label: 'Outro' },
];

// Denúncia de jogador, pelada ou arena — mesmo formulário pros 3 tipos,
// só muda o alvo. Quem denunciou nunca aparece pra ninguém além da
// administração (POST /api/denuncias, alvo_tipo/alvo_id decidem o resto).
export default function DenunciarModal({ alvoTipo, alvoId, alvoLabel, onClose, onEnviado }) {
  const [motivo, setMotivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleEnviar() {
    if (!motivo) { setError('Escolhe um motivo.'); return; }
    setLoading(true);
    setError('');
    const res = await fetch('/api/denuncias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alvoTipo, alvoId, motivo, descricao }),
    });
    const result = await res.json();
    setLoading(false);
    if (!res.ok) { setError(result.error || 'Não consegui enviar. Tenta de novo.'); return; }
    onEnviado();
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Denunciar {alvoLabel}</h3>
        <p>A administração vai analisar. Quem você é não aparece pra ninguém além dela.</p>
        <div className="pl-field">
          <label>Motivo</label>
          <select className="pl-select" value={motivo} onChange={(e) => setMotivo(e.target.value)} style={{ width: '100%' }}>
            <option value="">Escolhe um motivo</option>
            {MOTIVOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <div className="pl-field">
          <label>Descrição (opcional)</label>
          <textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} style={{ width: '100%' }} maxLength={500} />
        </div>
        {error && <p className="pl-error">{error}</p>}
        <div className="pl-modal-actions">
          <button type="button" className="pl-btn-secondary" onClick={onClose}>Voltar</button>
          <button type="button" className="pl-btn-secondary" disabled={loading} onClick={handleEnviar}>
            {loading ? 'Enviando...' : 'Enviar denúncia'}
          </button>
        </div>
      </div>
    </div>
  );
}
