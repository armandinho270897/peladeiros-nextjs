'use client';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import StarRating from './StarRating';
import TicketButton from './TicketButton';
import LoadingBall from './LoadingBall';
import BolaParadaIcon from './BolaParadaIcon';
import { useAuth } from './AuthProvider';

export default function AvaliarModal({ game, onClose, onSaved }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [avaliaveis, setAvaliaveis] = useState([]);
  const [notas, setNotas] = useState({});
  const [tags, setTags] = useState({});
  const [mostraCapitao, setMostraCapitao] = useState(false);
  const [mostraGeral, setMostraGeral] = useState(false);
  const [notaCapitao, setNotaCapitao] = useState(0);
  const [tagCapitao, setTagCapitao] = useState('');
  const [notaGeral, setNotaGeral] = useState(0);
  const [tagGeral, setTagGeral] = useState('');

  useEffect(() => {
    async function load() {
      const [gameRes, avaliarRes] = await Promise.all([
        fetch(`/api/games/${game.id}`).then((r) => r.json()),
        fetch(`/api/games/${game.id}/avaliar`).then((r) => r.json()),
      ]);
      const jaAvaliados = new Set(avaliarRes.avaliados || []);
      // Exclui o capitão daqui: ele já tem seção própria ("Avalie o
      // capitão", abaixo) desde que a criação da pelada passou a dar a ele
      // uma linha normal em confirmacoes — sem isso ele apareceria duas
      // vezes (como jogador comum E como capitão), inflando a Moral dele
      // com peso dobrado (tipo 'capitao' vale 2x em lib/moral.js).
      const outros = (gameRes.confirmacoes || []).filter(
        (c) => c.status === 'aprovado' && c.user_id && c.user_id !== user?.id && c.user_id !== game.owner_id && !jaAvaliados.has(c.user_id)
      );
      setAvaliaveis(outros);
      setMostraCapitao(!!game.owner_id && game.owner_id !== user?.id && !avaliarRes.capitaoAvaliado);
      setMostraGeral(!avaliarRes.geralAvaliado);
      setLoading(false);
    }
    load();
  }, [game.id, game.owner_id, user]);

  async function handleSubmit(e) {
    e.preventDefault();
    const avaliacoes = avaliaveis
      .filter((a) => notas[a.user_id] > 0)
      .map((a) => ({ avaliado_id: a.user_id, nota: notas[a.user_id], tag: tags[a.user_id] || '', tipo: 'jogador' }));

    if (mostraCapitao && notaCapitao > 0) {
      avaliacoes.push({ avaliado_id: game.owner_id, nota: notaCapitao, tag: tagCapitao, tipo: 'capitao' });
    }
    if (mostraGeral && notaGeral > 0) {
      avaliacoes.push({ nota: notaGeral, tag: tagGeral, tipo: 'geral' });
    }

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
        ) : avaliaveis.length === 0 && !mostraCapitao && !mostraGeral ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <BolaParadaIcon width={64} />
            <p className="pl-hint">Todo mundo já foi avaliado nessa pelada (ou não tinha ninguém pra avaliar).</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {avaliaveis.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
                {avaliaveis.map((a) => (
                  <div key={a.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar nome={a.nome} size={32} fotoUrl={a.foto_url} />
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
            )}

            {mostraCapitao && (
              <div style={{ borderTop: '1px solid rgba(110,113,120,0.3)', paddingTop: 12, marginBottom: 14 }}>
                <div className="pl-section-title" style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)', marginBottom: 8 }}>Avalie o capitão</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar nome={game.capitao} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.capitao}</div>
                    <StarRating value={notaCapitao} onChange={setNotaCapitao} />
                  </div>
                  <input
                    placeholder="tag (opcional)"
                    value={tagCapitao}
                    onChange={(e) => setTagCapitao(e.target.value)}
                    style={{ width: 110, background: 'var(--ink)', border: '1px solid rgba(110,113,120,0.4)', color: 'var(--paper)', padding: '6px 8px', borderRadius: 3, fontSize: 12 }}
                  />
                </div>
              </div>
            )}

            {mostraGeral && (
              <div style={{ borderTop: '1px solid rgba(110,113,120,0.3)', paddingTop: 12, marginBottom: 14 }}>
                <div className="pl-section-title" style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)', marginBottom: 8 }}>Avaliação geral da partida</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <StarRating value={notaGeral} onChange={setNotaGeral} />
                  </div>
                  <input
                    placeholder="tag (opcional)"
                    value={tagGeral}
                    onChange={(e) => setTagGeral(e.target.value)}
                    style={{ width: 110, background: 'var(--ink)', border: '1px solid rgba(110,113,120,0.4)', color: 'var(--paper)', padding: '6px 8px', borderRadius: 3, fontSize: 12 }}
                  />
                </div>
              </div>
            )}

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
