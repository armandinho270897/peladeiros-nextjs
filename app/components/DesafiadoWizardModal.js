'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import TicketButton from './TicketButton';
import PlayerSearch from './PlayerSearch';
import TipoJogoIcon, { TIPOS_JOGO } from './icons/TipoJogoIcon';
import { TAMANHO_TIME_SUGERIDO, DURACAO_SUGERIDA_MIN } from '@/lib/desafiadoConstants';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });

const STEPS = ['Local', 'Agora?', 'Tipo e times', 'Duração', 'Jogadores'];

// Wizard de criação do "Desafiado" — mesmo esqueleto de passos do
// NewGameModal (WizardProgress/pl-modal), mas só pra jogo NA HORA. Se o
// capitão disser que não é agora, isso fecha e abre o fluxo normal de
// criar pelada em vez de deixar a pessoa presa aqui — agendamento já
// funciona bem lá, não precisa duplicar.
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

export default function DesafiadoWizardModal({ onCancel, onQuerAgendar }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [sorteando, setSorteando] = useState(false);

  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [arenaId, setArenaId] = useState('');
  const [local, setLocal] = useState('');
  const [bairro, setBairro] = useState('');
  const [eAgora, setEAgora] = useState(null); // null | true | false
  const [tipo, setTipo] = useState('');
  const [tamanhoTime, setTamanhoTime] = useState('');
  const [duracaoMin, setDuracaoMin] = useState('');
  const [jogadores, setJogadores] = useState([]);

  function addJogador(p) {
    const key = p.id || `convidado-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setJogadores((prev) => (p.id && prev.some((j) => j.id === p.id) ? prev : [...prev, { ...p, key }]));
  }
  function removeJogador(key) {
    setJogadores((prev) => prev.filter((j) => j.key !== key));
  }

  function escolherTipo(t) {
    setTipo(t);
    setTamanhoTime(String(TAMANHO_TIME_SUGERIDO[t] ?? 5));
    setDuracaoMin(String(DURACAO_SUGERIDA_MIN[t] ?? 10));
  }

  const tamanhoNum = parseInt(tamanhoTime, 10) || 0;
  const minimoJogadores = tamanhoNum * 2;

  const stepErrors = [
    !local.trim() || !bairro.trim()
      ? 'Preenche o local e o bairro.'
      : coords.lat == null || coords.lng == null
      ? 'Marca o local no mapa antes de continuar.'
      : '',
    eAgora !== true ? 'Confirma que o jogo é agora pra continuar por aqui.' : '',
    !tipo ? 'Escolhe o tipo de jogo.' : (!tamanhoNum || tamanhoNum < 1 ? 'Informa quantos jogadores tem em cada time.' : ''),
    !parseInt(duracaoMin, 10) ? 'Informa a duração de cada partida, em minutos.' : '',
    jogadores.length < minimoJogadores ? `Precisa de pelo menos ${minimoJogadores} jogadores (${tamanhoNum} por time, 2 times) pra sortear.` : '',
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

  async function handleSortear() {
    if (stepErrors[4]) { setError(stepErrors[4]); return; }
    setSorteando(true);
    setError('');
    const res = await fetch('/api/desafiado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        local: local.trim(), bairro: bairro.trim(), latitude: coords.lat, longitude: coords.lng, arenaId: arenaId || null,
        tipoJogo: tipo, tamanhoTime: tamanhoNum, duracaoMin: parseInt(duracaoMin, 10),
        jogadores: jogadores.map((j) => ({ id: j.id, nome: j.nome })),
      }),
    });
    const result = await res.json();
    if (!res.ok) { setSorteando(false); setError(result.error); return; }
    router.push(`/desafiado/${result.id}`);
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pl-modal">
        <h3>Desafiado</h3>
        <WizardProgress current={step} />

        {step === 0 && (
          <div>
            <div className="pl-field"><label>Local</label><input placeholder="Ex: Quadra do Zé" value={local} onChange={(e) => setLocal(e.target.value)} /></div>
            <div className="pl-field"><label>Bairro</label><input placeholder="Ex: Centro" value={bairro} onChange={(e) => setBairro(e.target.value)} /></div>
            <div className="pl-field">
              <label>Local no mapa</label>
              <LocationPickerMap
                lat={coords.lat}
                lng={coords.lng}
                onPick={(lat, lng) => setCoords({ lat, lng })}
                onAddressResolved={({ local: l, bairro: b }) => { if (l) setLocal(l); if (b) setBairro(b); }}
                onArenaPicked={(arena) => setArenaId(arena ? arena.id : '')}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="pl-hint">O Desafiado é só pra jogo acontecendo AGORA, com quem já tá no local. Pra marcar pra depois, usa o fluxo normal de criar pelada.</p>
            <div className="pl-modal-actions" style={{ marginTop: 12 }}>
              <button type="button" className="pl-btn-secondary" onClick={() => { setEAgora(false); onQuerAgendar(); }}>
                É pra depois
              </button>
              <TicketButton onClick={() => { setEAgora(true); setError(''); setStep(2); }}>É agora mesmo</TicketButton>
            </div>
            <div className="pl-modal-actions" style={{ marginTop: 8 }}>
              <button type="button" className="pl-btn-secondary" onClick={goBack}>Voltar</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="pl-field">
              <label>Tipo de jogo</label>
              <div className="pl-tipo-jogo-chips">
                {TIPOS_JOGO.filter((t) => t !== 'Outro').map((t) => (
                  <button key={t} type="button" className={`pl-chip pl-tipo-jogo-chip ${tipo === t ? 'active' : ''}`} onClick={() => escolherTipo(t)}>
                    <TipoJogoIcon tipo={t} size={16} /> {t}
                  </button>
                ))}
              </div>
            </div>
            {tipo && (
              <div className="pl-field">
                <label>Jogadores por time</label>
                <input type="number" min="1" max="15" value={tamanhoTime} onChange={(e) => setTamanhoTime(e.target.value)} />
                <p style={{ fontSize: 11, color: 'var(--paper-dim)', marginTop: 4 }}>Sugestão pra {tipo}: {TAMANHO_TIME_SUGERIDO[tipo]}. Ajusta se quiser.</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="pl-field">
            <label>Duração de cada partida (minutos)</label>
            <input type="number" min="1" max="60" value={duracaoMin} onChange={(e) => setDuracaoMin(e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--paper-dim)', marginTop: 4 }}>Quando o tempo acabar, quem tiver mais gol fica — em caso de empate, você escolhe prorrogação, pênaltis ou cara-ou-coroa na hora.</p>
          </div>
        )}

        {step === 4 && (
          <div className="pl-field">
            <label>Quem tá presente</label>
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
            <p style={{ fontSize: 12, color: 'var(--paper-dim)', marginTop: 8 }}>
              {jogadores.length} de {minimoJogadores} necessários pra sortear{jogadores.length >= tamanhoNum ? ` — dá pra formar ${Math.floor(jogadores.length / tamanhoNum)} time(s) de ${tamanhoNum}` : ''}.
            </p>
          </div>
        )}

        {error && <p className="pl-error">{error}</p>}

        {step !== 1 && (
          <div className="pl-modal-actions">
            {step === 0 ? (
              <button type="button" className="pl-btn-secondary" onClick={onCancel}>Cancelar</button>
            ) : (
              <button type="button" className="pl-btn-secondary" onClick={goBack}>Voltar</button>
            )}
            {step < STEPS.length - 1 ? (
              <TicketButton onClick={goNext}>Avançar</TicketButton>
            ) : (
              <TicketButton onClick={handleSortear} disabled={sorteando}>{sorteando ? 'Sorteando...' : 'Sortear times'}</TicketButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
