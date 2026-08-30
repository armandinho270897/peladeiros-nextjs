'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useArenas } from '@/lib/useArenas';
import { useAuth } from './AuthProvider';
import TicketButton from './TicketButton';
import PlayerSearch from './PlayerSearch';
import GameCard from './GameCard';
import TipoJogoIcon, { TIPOS_JOGO } from './TipoJogoIcon';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });

const STEPS = ['Local', 'Quando', 'Detalhes', 'Quem já vai', 'Revisão'];
const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function toISODate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function nextWeekday(base, targetDow) {
  const d = new Date(base);
  const diff = (targetDow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  return d;
}

function WizardProgress({ current }) {
  return (
    <div className="pl-wizard-progress">
      {STEPS.map((label, i) => (
        <div key={label} className={`pl-wizard-step ${i === current ? 'active' : ''} ${i < current ? 'done' : ''}`}>
          <div className="pl-wizard-dot">{i < current ? '✓' : i + 1}</div>
          <span className="pl-wizard-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function NewGameModal({ onCancel, onCreated }) {
  const { user, profile } = useAuth();
  const { arenas } = useArenas();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [arenaId, setArenaId] = useState('');
  const [local, setLocal] = useState('');
  const [bairro, setBairro] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [tipo, setTipo] = useState('');
  const [nivel, setNivel] = useState('');
  const [vagasTotais, setVagasTotais] = useState('');
  const [valor, setValor] = useState('');
  const [regras, setRegras] = useState('');
  const [jogadores, setJogadores] = useState([]);
  const [meusTimesCapitao, setMeusTimesCapitao] = useState([]);
  const [timeVinculado, setTimeVinculado] = useState('');

  useEffect(() => {
    fetch('/api/times?papel=capitao').then((r) => r.json()).then((t) => setMeusTimesCapitao(Array.isArray(t) ? t : [])).catch(() => {});
  }, []);

  // convidados sem conta têm id: null — usa uma key própria por entrada pra
  // não colidir entre vários convidados (senão remover/deduplicar por id
  // afetaria todos os convidados de uma vez, já que compartilham id: null)
  function addJogador(p) {
    const key = p.id || `convidado-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setJogadores((prev) => (p.id && prev.some((j) => j.id === p.id) ? prev : [...prev, { ...p, key }]));
  }
  function removeJogador(key) {
    setJogadores((prev) => prev.filter((j) => j.key !== key));
  }

  function handleArenaChange(id) {
    setArenaId(id);
    if (!id) return;
    const arena = arenas.find((a) => a.id === id);
    if (!arena) return;
    setLocal(arena.nome);
    setBairro(arena.bairro);
    setCoords({ lat: arena.latitude != null ? Number(arena.latitude) : null, lng: arena.longitude != null ? Number(arena.longitude) : null });
  }

  const stepErrors = [
    !local.trim() || !bairro.trim() ? 'Preenche o local e o bairro.' : '',
    !data || !horario ? 'Escolhe a data e o horário.' : '',
    !vagasTotais || Number(vagasTotais) < 1 ? 'Quantas vagas a pelada tem?' : '',
    '',
    '',
  ];

  function goNext() {
    if (stepErrors[step]) { setError(stepErrors[step]); return; }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goBack() {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handlePublish() {
    setSubmitting(true);
    const body = {
      local: local.trim(),
      bairro: bairro.trim(),
      data,
      horario,
      vagasTotais: parseInt(vagasTotais, 10),
      latitude: coords.lat,
      longitude: coords.lng,
      arenaId: arenaId || null,
      tipo: tipo || null,
      nivel: nivel || null,
      valor: valor ? parseFloat(valor) : null,
      regras: regras.trim() || null,
      jogadoresIniciais: jogadores.map((j) => ({ id: j.id, nome: j.nome })),
    };
    const res = await fetch('/api/games', { method: 'POST', body: JSON.stringify(body) });
    const result = await res.json();
    if (!res.ok) { setSubmitting(false); setError(result.error); return; }

    if (timeVinculado) {
      try {
        await fetch(`/api/games/${result.id}/vincular-time`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeId: timeVinculado }),
        });
      } catch {
        // pelada já foi criada com sucesso — vincular time é um extra, não bloqueia
      }
    }

    setSubmitting(false);
    setError('');
    onCreated(result);
  }

  // Mesma regra de preenchimento de POST /api/games: o capitão ocupa uma
  // vaga automaticamente, então só os primeiros (vagasTotais - 1) outros
  // jogadores entram como aprovado — o resto vai pra espera. Sem espelhar
  // essa conta aqui, a revisão prometia "X de Y vagas preenchidas" com
  // todo mundo aprovado, e depois de publicar o servidor mandava o último
  // pra espera silenciosamente — divergência real encontrada em revisão.
  const previewVagasTotais = parseInt(vagasTotais, 10) || jogadores.length + 1 || 1;
  const previewVagasParaOutros = Math.max(0, previewVagasTotais - 1);
  const previewGame = {
    id: 'preview',
    local: local || 'Local da pelada',
    bairro: bairro || 'Bairro',
    data: data || toISODate(new Date()),
    horario: horario || '00:00',
    vagas_totais: previewVagasTotais,
    capitao: profile?.nome || '',
    owner_id: user?.id,
    confirmacoes: jogadores.map((j, i) => ({
      id: j.key, user_id: j.id, nome: j.nome, status: i < previewVagasParaOutros ? 'aprovado' : 'espera',
    })),
  };
  const previewAprovadosCount = Math.min(jogadores.length, previewVagasParaOutros) + 1;

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pl-modal">
        <h3>Nova pelada</h3>
        <WizardProgress current={step} />

        {step === 0 && (
          <div>
            {arenas.length > 0 && (
              <div className="pl-field">
                <label>Vincular a uma arena existente (opcional)</label>
                <select className="pl-select" style={{ width: '100%' }} value={arenaId} onChange={(e) => handleArenaChange(e.target.value)}>
                  <option value="">Nenhuma — local livre</option>
                  {arenas.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.bairro})</option>)}
                </select>
              </div>
            )}
            <div className="pl-field"><label>Local</label><input placeholder="Ex: Quadra do Zé" value={local} onChange={(e) => setLocal(e.target.value)} /></div>
            <div className="pl-field"><label>Bairro</label><input placeholder="Ex: Centro" value={bairro} onChange={(e) => setBairro(e.target.value)} /></div>
            <div className="pl-field">
              <label>Local no mapa (opcional) — busque o endereço ou arraste o mapa</label>
              <LocationPickerMap
                lat={coords.lat}
                lng={coords.lng}
                onPick={(lat, lng) => setCoords({ lat, lng })}
                onAddressResolved={({ local: l, bairro: b }) => {
                  if (l) setLocal(l);
                  if (b) setBairro(b);
                }}
              />
              {coords.lat != null && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--paper-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                  <button type="button" className="pl-share-btn" onClick={() => setCoords({ lat: null, lng: null })}>Limpar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="pl-field">
              <label>Data</label>
              <div className="pl-date-shortcuts">
                <button type="button" onClick={() => setData(toISODate(new Date()))}>Hoje</button>
                <button type="button" onClick={() => setData(toISODate(addDays(new Date(), 1)))}>Amanhã</button>
                {DIAS_SEMANA.map((label, dow) => (
                  <button key={label} type="button" onClick={() => setData(toISODate(nextWeekday(new Date(), dow)))}>{label}</button>
                ))}
              </div>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ marginTop: 8 }} />
            </div>
            <div className="pl-field"><label>Horário</label><input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} /></div>
          </div>
        )}

        {step === 2 && (
          <div>
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
            <div className="pl-field"><label>Vagas totais</label><input type="number" min="1" max="30" value={vagasTotais} onChange={(e) => setVagasTotais(e.target.value)} /></div>
            <div className="pl-field"><label>Valor por pessoa em R$ (opcional)</label><input type="number" min="0" step="0.5" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
            <div className="pl-field"><label>Regras (opcional)</label><textarea rows={3} value={regras} onChange={(e) => setRegras(e.target.value)} placeholder="Ex: goleiro fixo, times de 5, sem cartão amarelo..." /></div>
          </div>
        )}

        {step === 3 && (
          <div>
            {meusTimesCapitao.length > 0 && (
              <div className="pl-field">
                <label>Vincular um time (opcional)</label>
                <select className="pl-select" style={{ width: '100%' }} value={timeVinculado} onChange={(e) => setTimeVinculado(e.target.value)}>
                  <option value="">Nenhum</option>
                  {meusTimesCapitao.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                {timeVinculado && (
                  <p style={{ fontSize: 11, color: 'var(--paper-dim)', marginTop: 4 }}>
                    Todos os membros aprovados do time entram como solicitação pendente assim que a pelada for publicada.
                  </p>
                )}
              </div>
            )}
            <div className="pl-field">
              <label>Quem já vai jogar (opcional)</label>
              <PlayerSearch onSelect={addJogador} excludeIds={jogadores.map((j) => j.id)} />
              {jogadores.length > 0 && (
                <div className="pl-selected-players">
                  {jogadores.map((j) => (
                    <span key={j.key} className="pl-selected-player-chip">
                      {j.nome}{!j.id && <span style={{ color: 'var(--gold)' }}> (convidado)</span>}
                      <button type="button" onClick={() => removeJogador(j.key)} aria-label={`Remover ${j.nome}`}>×</button>
                    </span>
                  ))}
                </div>
              )}
              {jogadores.length > 0 && vagasTotais && (
                <p style={{ fontSize: 11, color: 'var(--paper-dim)', marginTop: 4 }}>
                  {previewAprovadosCount} de {previewVagasTotais} vaga(s) já preenchida(s) (você conta como 1)
                  {jogadores.length > previewVagasParaOutros && (
                    <> — {jogadores.length - previewVagasParaOutros} vai(vão) pra espera, não cabe(m) nas vagas</>
                  )}
                </p>
              )}
            </div>
            <div className="pl-field">
              <label>Capitão</label>
              <p style={{ margin: 0, fontSize: 14 }}>{profile?.nome} <span style={{ color: 'var(--paper-dim)', fontSize: 12 }}>(você, logado)</span></p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="pl-hint">Confere como vai ficar antes de publicar:</p>
            <div style={{ pointerEvents: 'none' }}>
              <GameCard game={previewGame} currentUserId={null} onEdit={() => {}} onConfirm={() => {}} onShare={() => {}} onCancelPresenca={() => {}} onConfirmarVaga={() => {}} justLotou={false} artSizes="396px" />
            </div>
            {(tipo || nivel || valor || regras) && (
              <div className="pl-field" style={{ marginTop: 12 }}>
                <label>Detalhes</label>
                <div style={{ fontSize: 13, color: 'var(--paper-dim)', lineHeight: 1.6 }}>
                  {tipo && <div>Tipo: {tipo}</div>}
                  {nivel && <div>Nível: {nivel}</div>}
                  {valor && <div>Valor: R$ {Number(valor).toFixed(2)} por pessoa</div>}
                  {regras && <div>Regras: {regras}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="pl-error">{error}</p>}
        <div className="pl-modal-actions">
          {step === 0 ? (
            <button type="button" className="pl-btn-secondary" onClick={onCancel}>Cancelar</button>
          ) : (
            <button type="button" className="pl-btn-secondary" onClick={goBack}>Voltar</button>
          )}
          {step < STEPS.length - 1 ? (
            <TicketButton onClick={goNext}>Avançar</TicketButton>
          ) : (
            <TicketButton onClick={handlePublish} disabled={submitting}>{submitting ? 'Publicando...' : 'Publicar'}</TicketButton>
          )}
        </div>
      </div>
    </div>
  );
}
