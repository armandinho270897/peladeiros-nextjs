'use client';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import StarRating from './StarRating';
import TicketButton from './TicketButton';
import LoadingBall from './LoadingBall';
import { useAuth } from './AuthProvider';

export default function AvaliarModal({ game, onClose, onSaved }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [avaliaveis, setAvaliaveis] = useState([]);
  const [notas, setNotas] = useState({});
  const [tags, setTags] = useState({});

  useEffect(() => {
    async function load() {
      const [gameRes, avaliarRes] = await Promise.all([
        fetch(`/api/games/${game.id}`).then((r) => r.json()),
        fetch(`/api/games/${game.id}/avaliar`).then((r) => r.json()),
      ]);
      const jaAvaliados = new Set(avaliarRes.avaliados || []);
      const outros = (gameRes.confirmacoes || []).filter(
        (c) => c.status === 'aprovado' && c.user_id && c.user_id !== user?.id && !jaAvaliados.has(c.user_id)
      );
      setAvaliaveis(outros);
      setLoading(false);
    }
    load();
  }, [game.id, user]);

  async function handleSubmit(e) {
    e.preventDefault();
    const avaliacoes = avaliaveis
      .filter((a) => notas[a.user_id] > 0)
      .map((a) => ({ avaliado_id: a.user_id, nota: notas[a.user_id], tag: tags[a.user_id] || '' }));

    if (avaliacoes.length === 0) { setError('Marca pelo menos uma estrela pra alguém.'); return; }

    setSaving(true);
    setError('');
    const res = await fetch(`/api/games/${game.id}/avaliar`, { method: 'POST', body: JSON.stringify({ avaliacoes }) });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) { setError(result.error); return; }
    onSaved();
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Avaliar jogadores</h3>
        <p className="pl-hint" style={{ marginTop: -8 }}>{game.local} — {game.data}</p>

        {loading ? (
          <LoadingBall />
        ) : avaliaveis.length === 0 ? (
          <p className="pl-hint">Todo mundo já foi avaliado nessa pelada (ou não tinha ninguém pra avaliar).</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
              {avaliaveis.map((a) => (
                <div key={a.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar nome={a.nome} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</div>
                    <StarRating value={notas[a.user_id] || 0} onChange={(n) => setNotas((prev) => ({ ...prev, [a.user_id]: n }))} />
                  </div>
                  <input
                    placeholder="tag (opcional)"
                    value={tags[a.user_id] || ''}
                    onChange={(e) => setTags((prev) => ({ ...prev, [a.user_id]: e.target.value }))}
                    style={{ width: 110, background: 'var(--ink)', border: '1px solid rgba(110,113,120,0.4)', color: 'var(--paper)', padding: '6px 8px', borderRadius: 3, fontSize: 12 }}
                  />
                </div>
              ))}
            </div>
            {error && <p className="pl-error">{error}</p>}
            <div className="pl-modal-actions">
              <button type="button" className="pl-btn-secondary" onClick={onClose}>Fechar</button>
              <TicketButton type="submit" disabled={saving}>{saving ? 'Enviando...' : 'Enviar avaliações'}</TicketButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
