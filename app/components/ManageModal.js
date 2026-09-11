'use client';
import { useState, useEffect, useCallback } from 'react';
import { getCaptainCode, saveCaptainCode } from '@/lib/captainCodes';
import { pendentesDe, aguardandoConfirmacaoDe, aprovadosDe, POSICAO_LABEL, emCimaDaHora } from '@/lib/gameUtils';
import { useArenas } from '@/lib/useArenas';
import Avatar from './Avatar';
import TicketButton from './TicketButton';
import PlayerSearch from './PlayerSearch';
import TipoJogoIcon, { TIPOS_JOGO } from './TipoJogoIcon';

export default function ManageModal({ game, onClose, onSaved }) {
  const semOwner = !game.owner_id;
  const savedCode = semOwner ? getCaptainCode(game.id) : null;
  const [unlocked, setUnlocked] = useState(!semOwner || !!savedCode);
  const [codigo, setCodigo] = useState(savedCode || '');
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState(game);
  const [actingId, setActingId] = useState(null);
  const [respostas, setRespostas] = useState({});
  const { arenas } = useArenas();

  // Arena/tipo/nível/valor/regras precisam de estado controlado (o resto do
  // form usa `f.campo.value` sem state) pra escolher uma arena já preencher
  // local/bairro sozinho, igual ao wizard de criar pelada.
  const [arenaId, setArenaId] = useState(game.arena_id || '');
  const [local, setLocal] = useState(game.local || '');
  const [bairro, setBairro] = useState(game.bairro || '');
  const [tipo, setTipo] = useState(game.tipo || '');
  const [nivel, setNivel] = useState(game.nivel || '');
  const [valor, setValor] = useState(game.valor != null ? String(game.valor) : '');
  const [regras, setRegras] = useState(game.regras || '');

  useEffect(() => {
    setArenaId(gameData.arena_id || '');
    setLocal(gameData.local || '');
    setBairro(gameData.bairro || '');
    setTipo(gameData.tipo || '');
    setNivel(gameData.nivel || '');
    setValor(gameData.valor != null ? String(gameData.valor) : '');
    setRegras(gameData.regras || '');
  }, [gameData]);

  function handleArenaChange(id) {
    setArenaId(id);
    if (!id) return;
    const arena = arenas.find((a) => a.id === id);
    if (!arena) return;
    setLocal(arena.nome);
    setBairro(arena.bairro);
  }

  function setResposta(id, valor) {
    setRespostas((prev) => ({ ...prev, [id]: valor }));
  }

  function posicoesLabel(p) {
    return (p.posicoes || []).map((s) => POSICAO_LABEL[s] || s).join(' / ');
  }

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
      local: local.trim(),
      bairro: bairro.trim(),
      data: f.data.value,
      horario: f.horario.value,
      vagasTotais: parseInt(f.vagas.value, 10),
      arenaId: arenaId || null,
      tipo: tipo || null,
      nivel: nivel || null,
      valor: valor ? parseFloat(valor) : null,
      regras: regras.trim() || null,
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
    const res = await fetch(`/api/confirmacoes/${id}/aprovar`, { method: 'POST', body: JSON.stringify({ codigo, mensagemCapitao: respostas[id] || '' }) });
    const result = await res.json();
    setActingId(null);
    if (!res.ok) { setError(result.error); return; }
    setError('');
    setResposta(id, '');
    reload();
  }

  async function handleRejeitar(id) {
    setActingId(id);
    const res = await fetch(`/api/confirmacoes/${id}/rejeitar`, { method: 'POST', body: JSON.stringify({ codigo, mensagemCapitao: respostas[id] || '' }) });
    const result = await res.json();
    setActingId(null);
    if (!res.ok) { setError(result.error); return; }
    setError('');
    setResposta(id, '');
    reload();
  }

  async function handleMarcarPago(id, pago) {
    setActingId(id);
    const res = await fetch(`/api/confirmacoes/${id}/pagamento`, { method: 'PATCH', body: JSON.stringify({ codigo, pago }) });
    const result = await res.json();
    setActingId(null);
    if (!res.ok) { setError(result.error); return; }
    setError('');
    reload();
  }

  async function handleCobrarPagamento(id) {
    setActingId(id);
    const res = await fetch(`/api/confirmacoes/${id}/cobrar-pagamento`, { method: 'POST', body: JSON.stringify({ codigo }) });
    const result = await res.json();
    setActingId(null);
    if (!res.ok) { setError(result.error); return; }
  }

  async function handleAdicionarJogador(p) {
    setActingId(p.id || p.nome);
    const res = await fetch(`/api/games/${game.id}/adicionar-jogador`, { method: 'POST', body: JSON.stringify({ userId: p.id, nome: p.nome, codigo }) });
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
  const aguardandoConfirmacao = aguardandoConfirmacaoDe(gameData);

  function prazoRestante(prazoConfirmacao) {
    if (!prazoConfirmacao) return null;
    const diff = new Date(prazoConfirmacao).getTime() - Date.now();
    if (diff <= 0) return 'prazo vencendo';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `expira em ${h}h${String(m).padStart(2, '0')}min` : `expira em ${m}min`;
  }

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
            <div className="pl-pending-title pl-section-title">Solicitações pendentes</div>
            {pendentes.map((p) => (
              <div key={p.id} className="pl-pending-row">
                <Avatar nome={p.nome} size={30} fotoUrl={p.foto_url} />
                <div className="pl-pending-info">
                  <div className="pl-pending-nome">{p.nome}</div>
                  <div className="pl-pending-meta">
                    {p.bairro && <span>{p.bairro}</span>}
                    {p.posicoes?.length > 0 && <span>{posicoesLabel(p)}</span>}
                    {p.moral != null && <span>★{p.moral.toFixed(1)} moral</span>}
                    <span>{p.peladas_jogadas} pelada{p.peladas_jogadas === 1 ? '' : 's'} jogada{p.peladas_jogadas === 1 ? '' : 's'}</span>
                  </div>
                  {p.mensagem && <p className="pl-pending-msg">"{p.mensagem}"</p>}
                  <input
                    type="text"
                    className="pl-pending-resposta-input"
                    placeholder="Mensagem pro jogador (opcional)"
                    maxLength={200}
                    value={respostas[p.id] || ''}
                    onChange={(e) => setResposta(p.id, e.target.value)}
                  />
                </div>
                <div className="pl-pending-actions">
                  <button type="button" className="pl-btn-secondary pl-btn-danger" disabled={actingId === p.id} onClick={() => handleRejeitar(p.id)}>Rejeitar</button>
                  <TicketButton compact disabled={actingId === p.id} onClick={() => handleAprovar(p.id)}>Aprovar</TicketButton>
                </div>
              </div>
            ))}
          </div>
        )}

        {aguardandoConfirmacao.length > 0 && (
          <div className="pl-pending-section">
            <div className="pl-pending-title pl-section-title">Aguardando confirmação do jogador</div>
            {aguardandoConfirmacao.map((p) => (
              <div key={p.id} className="pl-pending-row">
                <Avatar nome={p.nome} size={30} fotoUrl={p.foto_url} />
                <div className="pl-pending-info">
                  <div className="pl-pending-nome">{p.nome}</div>
                  <div className="pl-pending-meta">
                    {p.bairro && <span>{p.bairro}</span>}
                    {p.posicoes?.length > 0 && <span>{posicoesLabel(p)}</span>}
                    {prazoRestante(p.prazo_confirmacao) && <span>{prazoRestante(p.prazo_confirmacao)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {gameData.valor != null && aprovadosDe(gameData).length > 0 && (
          <div className="pl-pending-section">
            <div className="pl-pending-title pl-section-title">Pagamentos — R$ {Number(gameData.valor).toFixed(2)} por pessoa</div>
            {aprovadosDe(gameData).map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <Avatar nome={p.nome} size={28} fotoUrl={p.foto_url} />
                <span style={{ flex: 1, fontSize: 14 }}>{p.nome}</span>
                {p.pago ? (
                  <button type="button" className="pl-share-btn" disabled={actingId === p.id} onClick={() => handleMarcarPago(p.id, false)}>Pago ✓</button>
                ) : (
                  <>
                    {p.user_id && (
                      <button type="button" className="pl-share-btn" disabled={actingId === p.id} onClick={() => handleCobrarPagamento(p.id)}>Cobrar</button>
                    )}
                    <TicketButton compact disabled={actingId === p.id} onClick={() => handleMarcarPago(p.id, true)}>Marcar pago</TicketButton>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <form key="edit-form" onSubmit={handleSave}>
          {arenas.length > 0 && (
            <div className="pl-field">
              <label>Vincular a uma arena existente (opcional)</label>
              <select className="pl-select" style={{ width: '100%' }} value={arenaId} onChange={(e) => handleArenaChange(e.target.value)}>
                <option value="">Nenhuma — local livre</option>
                {arenas.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.bairro})</option>)}
              </select>
            </div>
          )}
          <div className="pl-field"><label>Local</label><input value={local} onChange={(e) => setLocal(e.target.value)} /></div>
          <div className="pl-field"><label>Bairro</label><input value={bairro} onChange={(e) => setBairro(e.target.value)} /></div>
          <div className="pl-field"><label>Data</label><input type="date" name="data" defaultValue={gameData.data} /></div>
          <div className="pl-field"><label>Horário</label><input type="time" name="horario" defaultValue={gameData.horario} /></div>
          <div className="pl-field"><label>Vagas totais</label><input type="number" name="vagas" defaultValue={gameData.vagas_totais} /></div>
          <div className="pl-field">
            <label>Tipo de jogo (opcional)</label>
            <div className="pl-tipo-jogo-chips">
              {TIPOS_JOGO.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`pl-chip pl-tipo-jogo-chip ${tipo === t ? 'active' : ''}`}
                  onClick={() => setTipo(tipo === t ? '' : t)}
                >
                  <TipoJogoIcon tipo={t} size={16} /> {t}
                </button>
              ))}
            </div>
          </div>
          <div className="pl-field">
            <label>Nível (opcional)</label>
            <select className="pl-select" style={{ width: '100%' }} value={nivel} onChange={(e) => setNivel(e.target.value)}>
              <option value="">Não informar</option>
              <option value="Iniciante">Iniciante</option>
              <option value="Intermediário">Intermediário</option>
              <option value="Avançado">Avançado</option>
              <option value="Qualquer nível">Qualquer nível</option>
            </select>
          </div>
          <div className="pl-field"><label>Valor por pessoa em R$ (opcional)</label><input type="number" min="0" step="0.5" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <div className="pl-field"><label>Regras (opcional)</label><textarea rows={3} value={regras} onChange={(e) => setRegras(e.target.value)} placeholder="Ex: goleiro fixo, times de 5, sem cartão amarelo..." /></div>
          {emCimaDaHora(gameData) && (
            <p className="pl-error">Tá em cima da hora — cancelar agora deixa todo mundo sem tempo de se reorganizar.</p>
          )}
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
