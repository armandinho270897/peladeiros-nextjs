'use client';
import { useState } from 'react';

// Toda ação perigosa da administração passa por aqui: confirmação +
// motivo obrigatório antes do POST, nunca um clique direto num botão.
export default function MotivoModal({ titulo, descricao, labelBotao = 'Confirmar', perigoso = true, onCancel, onConfirm }) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    if (!motivo.trim()) { setError('Informe o motivo.'); return; }
    setLoading(true);
    setError('');
    try {
      await onConfirm(motivo.trim());
    } catch (err) {
      setError(err.message || 'Não consegui processar. Tenta de novo.');
      setLoading(false);
    }
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pl-modal">
        <h3>{titulo}</h3>
        {descricao && <p>{descricao}</p>}
        <div className="pl-field">
          <label>Motivo</label>
          <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} style={{ width: '100%' }} />
        </div>
        {error && <p className="pl-error">{error}</p>}
        <div className="pl-modal-actions">
          <button type="button" className="pl-btn-secondary" onClick={onCancel}>Voltar</button>
          <button type="button" className={`pl-btn-secondary ${perigoso ? 'pl-btn-danger' : ''}`} disabled={loading} onClick={handleConfirm}>
            {loading ? 'Enviando...' : labelBotao}
          </button>
        </div>
      </div>
    </div>
  );
}
