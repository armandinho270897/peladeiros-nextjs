'use client';
import { useState } from 'react';
import { aprovadosDe, POSICAO_LABEL } from '@/lib/gameUtils';
import { balancearTimes } from '@/lib/balancearTimes';
import { getCaptainCode } from '@/lib/captainCodes';
import Avatar from './Avatar';
import TicketButton from './TicketButton';

// Monta os times A/B pra essa pelada — não confundir com a tabela `times`
// (clubes permanentes). Começa com o que já tiver salvo (ou tudo "sem
// time" na primeira vez); "Balancear automaticamente" sugere uma divisão
// por posição+moral (lib/balancearTimes.js), mas o capitão pode ajustar
// cada jogador na mão antes de salvar.
export default function MontarTimesModal({ game, onClose, onSaved }) {
  const aprovados = aprovadosDe(game);
  const [times, setTimes] = useState(() => {
    const inicial = {};
    aprovados.forEach((c) => { inicial[c.id] = c.time || null; });
    return inicial;
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function setTime(id, time) {
    setTimes((prev) => ({ ...prev, [id]: prev[id] === time ? null : time }));
  }

  function handleBalancear() {
    setTimes(balancearTimes(aprovados));
  }

  async function handleSalvar() {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/games/${game.id}/times`, {
      method: 'PATCH',
      body: JSON.stringify({ codigo: getCaptainCode(game.id) || '', atribuicoes: times }),
    });
    const result = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(result.error || 'Não consegui salvar. Tenta de novo.'); return; }
    onSaved();
  }

  const contA = Object.values(times).filter((t) => t === 'A').length;
  const contB = Object.values(times).filter((t) => t === 'B').length;

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Montar times</h3>
        <p className="pl-hint">Divide os aprovados em Time A e Time B pra jogar. Aparece na Escalação assim que salvar.</p>

        {aprovados.length === 0 ? (
          <p className="pl-hint">Ninguém confirmado nessa pelada ainda.</p>
        ) : (
          <>
            <button type="button" className="pl-share-btn" onClick={handleBalancear} style={{ marginBottom: 12 }}>
              Balancear automaticamente
            </button>

            <p className="pl-hint" style={{ marginTop: 0 }}>Time A: {contA} · Time B: {contB} · Sem time: {aprovados.length - contA - contB}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '10px 0' }}>
              {aprovados.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar nome={c.nome} size={28} fotoUrl={c.foto_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                    {c.posicoes?.[0] && <div style={{ fontSize: 11, color: 'var(--paper-dim)' }}>{POSICAO_LABEL[c.posicoes[0]] || c.posicoes[0]}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className={`pl-chip ${times[c.id] === 'A' ? 'active' : ''}`} onClick={() => setTime(c.id, 'A')}>A</button>
                    <button type="button" className={`pl-chip ${times[c.id] === 'B' ? 'active' : ''}`} onClick={() => setTime(c.id, 'B')}>B</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {error && <p className="pl-error">{error}</p>}
        <div className="pl-modal-actions">
          <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
          <TicketButton onClick={handleSalvar} disabled={loading || aprovados.length === 0}>{loading ? 'Salvando...' : 'Salvar times'}</TicketButton>
        </div>
      </div>
    </div>
  );
}
