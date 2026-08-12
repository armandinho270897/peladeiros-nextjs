'use client';
import { useState, useEffect, useCallback } from 'react';
import { getCaptainCode, saveCaptainCode } from '@/lib/captainCodes';
import { pendentesDe, POSICAO_LABEL } from '@/lib/gameUtils';
import Avatar from './Avatar';
import TicketButton from './TicketButton';
import PlayerSearch from './PlayerSearch';

export default function ManageModal({ game, onClose, onSaved }) {
  const semOwner = !game.owner_id;
  const savedCode = semOwner ? getCaptainCode(game.id) : null;
  const [unlocked, setUnlocked] = useState(!semOwner || !!savedCode);
  const [codigo, setCodigo] = useState(savedCode || '');
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState(game);
  const [actingId, setActingId] = useState(null);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/games/${game.id}`);
    if (res.ok) setGameData(await res.json());
  }, [game.id]);

  useEffect(() => {
    if (unlocked) reload();
  }, [unlocked, reload]);

  function tryUnlock(e) {
    e.preventDefault();
    setUnlocked(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const f = e.target;
    const body = {
      codigo,
      local: f.local.value.trim(),
      bairro: f.bairro.value.trim(),
      data: f.data.value,
      horario: f.horario.value,
      vagasTotais: parseInt(f.vagas.value, 10),
    };
    const res = await fetch(`/api/games/${game.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    if (!res.ok) { const r = await res.json(); setError(r.error); return; }
    if (semOwner) saveCaptainCode(game.id, codigo);
    onSaved();
  }

  async function handleCancelGame() {
    if (!confirm('Tem certeza? Isso não pode ser desfeito.')) return;
    const res = await fetch(`/api/games/${game.id}`, { method: 'DELETE', body: JSON.stringify({ codigo }) });
    if (!res.ok) { const r = await res.json(); setError(r.error); return; }
    onSaved();
  }

  async function handleAprovar(id) {
    setActingId(id);
    const res = await fetch(`/api/confirmacoes/${id}/aprovar`, { method: 'POST', body: JSON.stringify({ codigo }) });
    const result = await res.json();
    setActingId(null);
    if (!res.ok) { setError(result.error); return; }
    setError('');
    reload();
  }

  async function handleRejeitar(id) {
    setActingId(id);
    const res = await fetch(`/api/confirmacoes/${id}/rejeitar`, { method: 'POST', body: JSON.stringify({ codigo }) });
    const result = await res.json();
    setActingId(null);
    if (!res.ok) { setError(result.error); return; }
    setError('');
    reload();
  }

  async function handleAdicionarJogador(p) {
    setActingId(p.id);
    const res = await fetch(`/api/games/${game.id}/adicionar-jogador`, { method: 'POST', body: JSON.stringify({ userId: p.id, codigo }) });
    const result = await res.json();
    setActingId(null);
    if (!res.ok) { setError(result.error); return; }
    setError('');
    reload();
  }

  if (!unlocked) {
    return (
      <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="pl-modal">
          <h3>Área do capitão</h3>
          <form key="unlock-form" onSubmit={tryUnlock}>
            <div className="pl-field"><label>Código</label><input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={4} /></div>
            {error && <p className="pl-error">{error}</p>}
            <div className="pl-modal-actions">
              <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
              <TicketButton type="submit">Entrar</TicketButton>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const pendentes = pendentesDe(gameData);

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>Editar pelada</h3>

        <div className="pl-field">
          <label>Adicionar jogador</label>
          <PlayerSearch
            onSelect={handleAdicionarJogador}
            excludeIds={(gameData.confirmacoes || []).map((c) => c.user_id).filter(Boolean)}
          />
        </div>

        {pendentes.length > 0 && (
          <div className="pl-pending-section">
            <div className="pl-pending-title">Solicitações pendentes</div>
            {pendentes.map((p) => (
              <div key={p.id} className="pl-pending-row">
                <Avatar nome={p.nome} size={30} />
                <div className="pl-pending-info">
                  <div className="pl-pending-nome">{p.nome}</div>
                  <div className="pl-pending-meta">
                    {p.bairro && <span>{p.bairro}</span>}
                    {p.posicao && <span>{POSICAO_LABEL[p.posicao] || p.posicao}</span>}
                    {p.nota_media != null && <span>★{p.nota_media.toFixed(1)}</span>}
                    <span>{p.peladas_jogadas} pelada{p.peladas_jogadas === 1 ? '' : 's'} jogada{p.peladas_jogadas === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="pl-pending-actions">
                  <button type="button" className="pl-btn-secondary" disabled={actingId === p.id} onClick={() => handleRejeitar(p.id)}>Rejeitar</button>
                  <TicketButton compact disabled={actingId === p.id} onClick={() => handleAprovar(p.id)}>Aprovar</TicketButton>
                </div>
              </div>
            ))}
          </div>
        )}

        <form key="edit-form" onSubmit={handleSave}>
          <div className="pl-field"><label>Local</label><input name="local" defaultValue={gameData.local} /></div>
          <div className="pl-field"><label>Bairro</label><input name="bairro" defaultValue={gameData.bairro} /></div>
          <div className="pl-field"><label>Data</label><input type="date" name="data" defaultValue={gameData.data} /></div>
          <div className="pl-field"><label>Horário</label><input type="time" name="horario" defaultValue={gameData.horario} /></div>
          <div className="pl-field"><label>Vagas totais</label><input type="number" name="vagas" defaultValue={gameData.vagas_totais} /></div>
          {error && <p className="pl-error">{error}</p>}
          <div className="pl-modal-actions">
            <button type="button" className="pl-btn-secondary pl-btn-danger" onClick={handleCancelGame}>Cancelar pelada</button>
            <TicketButton type="submit">Salvar</TicketButton>
          </div>
        </form>
      </div>
    </div>
  );
}
