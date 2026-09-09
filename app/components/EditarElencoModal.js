'use client';
import { useState } from 'react';
import TicketButton from './TicketButton';
import { POSICOES_POR_MODALIDADE, POSICAO_LABEL } from '@/lib/gameUtils';

// Posição/número/mensalista específicos desse time — reaproveita o mesmo
// picker de chips por categoria que EditProfileModal já usa pra posição do
// perfil, só que de seleção única (aqui é "a posição dele NESSE time", não
// uma lista de posições que ele pode jogar).
export default function EditarElencoModal({ membro, modalidade, onClose, onSaved }) {
  const [posicao, setPosicao] = useState(membro.posicao || '');
  const [numeroCamisa, setNumeroCamisa] = useState(membro.numero_camisa ?? '');
  const [mensalista, setMensalista] = useState(!!membro.mensalista);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const categorias = modalidade && POSICOES_POR_MODALIDADE[modalidade]
    ? POSICOES_POR_MODALIDADE[modalidade]
    : [{ categoria: null, opcoes: Object.keys(POSICAO_LABEL) }];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch(`/api/time-membros/${membro.id}/elenco`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posicao: posicao || null, numeroCamisa, mensalista }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(json.error || 'Não consegui salvar. Tenta de novo.'); return; }
    onSaved(json);
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>{membro.profiles?.nome}</h3>
        <form onSubmit={handleSubmit}>
          <div className="pl-field">
            <label>Posição nesse time (opcional)</label>
            {categorias.map(({ categoria, opcoes }) => (
              <div key={categoria || 'sem-categoria'} className="pl-posicoes-categoria">
                {categoria && <span className="pl-posicoes-categoria-label">{categoria}</span>}
                <div className="pl-posicoes-chips">
                  {opcoes.map((slug) => (
                    <button
                      key={slug}
                      type="button"
                      className={`pl-chip ${posicao === slug ? 'active' : ''}`}
                      onClick={() => setPosicao(posicao === slug ? '' : slug)}
                    >
                      {POSICAO_LABEL[slug] || slug}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pl-field"><label>Número da camisa (opcional)</label><input type="number" min={1} max={99} value={numeroCamisa} onChange={(e) => setNumeroCamisa(e.target.value)} /></div>

          <div className="pl-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none' }}>
              <input type="checkbox" checked={mensalista} onChange={(e) => setMensalista(e.target.checked)} />
              Mensalista
            </label>
          </div>

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
