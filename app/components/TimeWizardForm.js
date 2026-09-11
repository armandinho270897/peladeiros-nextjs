'use client';
import { useState } from 'react';
import TicketButton from './TicketButton';
import Avatar from './Avatar';
import UniformPreview from './UniformPreview';
import { MODALIDADES } from '@/lib/gameUtils';
import { DIAS_SEMANA, RECRUTAMENTO_OPCOES, NIVEL_COMPETITIVO_OPCOES, FAIXA_ETARIA_OPCOES, CORES_UNIFORME } from '@/lib/timeConstants';
import { useArenas } from '@/lib/useArenas';

const STEPS = ['Identidade', 'Estrutura', 'Perfil & Contato'];

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

function ColorPicker({ label, value, onChange }) {
  return (
    <div className="pl-field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {CORES_UNIFORME.map((cor) => (
          <button
            key={cor}
            type="button"
            onClick={() => onChange(cor)}
            aria-label={cor}
            style={{
              width: 26, height: 26, borderRadius: '50%', background: cor, cursor: 'pointer', padding: 0,
              border: value === cor ? '2px solid var(--neon)' : '2px solid rgba(255,255,255,0.2)',
              boxShadow: value === cor ? '0 0 8px rgba(166,255,0,0.5)' : 'none',
            }}
          />
        ))}
        <input
          type="color"
          value={value || '#6E7178'}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 26, height: 26, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
          aria-label={`${label} — cor personalizada`}
        />
      </div>
    </div>
  );
}

// Formulário compartilhado por NewTimeModal/EditTimeModal — wizard em 3
// etapas (mesmo padrão de NewGameModal.js: STEPS + step state + validação
// por etapa), em vez do formulário linear anterior. `time` presente = modo
// edição (PATCH); ausente = criação (POST).
export default function TimeWizardForm({ time, onClose, onSaved }) {
  const isEdit = !!time;
  const { arenas } = useArenas();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [escudoFile, setEscudoFile] = useState(null);
  const [escudoPreview, setEscudoPreview] = useState(time?.escudo_url || null);
  const [nome, setNome] = useState(time?.nome || '');
  const [sigla, setSigla] = useState(time?.sigla || '');
  const [anoFundacao, setAnoFundacao] = useState(time?.ano_fundacao || '');
  const [corPrimaria, setCorPrimaria] = useState(time?.cor_primaria || '');
  const [corSecundaria, setCorSecundaria] = useState(time?.cor_secundaria || '');

  const [bairro, setBairro] = useState(time?.bairro || '');
  const [arenaId, setArenaId] = useState(time?.arena_id || '');
  const [modalidade, setModalidade] = useState(time?.modalidade || '');
  const [diaJogo, setDiaJogo] = useState(time?.dia_jogo || '');
  const [horarioJogo, setHorarioJogo] = useState(time?.horario_jogo || '');
  const [tecnico, setTecnico] = useState(time?.tecnico || '');
  const [maxJogadores, setMaxJogadores] = useState(time?.max_jogadores || 15);

  const [nivelCompetitivo, setNivelCompetitivo] = useState(time?.nivel_competitivo || '');
  const [recrutamento, setRecrutamento] = useState(time?.recrutamento || 'fechado');
  const [aceitaDesafios, setAceitaDesafios] = useState(time?.aceita_desafios || false);
  const [faixaEtaria, setFaixaEtaria] = useState(time?.faixa_etaria || '');
  const [whatsappResponsavel, setWhatsappResponsavel] = useState(time?.whatsapp_responsavel || '');
  const [mensalidadeValor, setMensalidadeValor] = useState(time?.mensalidade_valor ?? '');

  function handleEscudoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEscudoFile(file);
    setEscudoPreview(URL.createObjectURL(file));
  }

  const stepErrors = [
    !nome.trim() ? 'Dá um nome pro time.' : '',
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

  async function handleSubmit() {
    if (stepErrors[0]) { setStep(0); setError(stepErrors[0]); return; }

    setLoading(true);
    setError('');
    const form = new FormData();
    form.set('nome', nome.trim());
    form.set('sigla', sigla.trim());
    form.set('anoFundacao', anoFundacao);
    form.set('corPrimaria', corPrimaria);
    form.set('corSecundaria', corSecundaria);
    form.set('bairro', bairro.trim());
    form.set('arenaId', arenaId);
    form.set('modalidade', modalidade);
    form.set('diaJogo', diaJogo);
    form.set('horarioJogo', horarioJogo);
    form.set('tecnico', tecnico.trim());
    form.set('maxJogadores', maxJogadores);
    form.set('nivelCompetitivo', nivelCompetitivo);
    form.set('recrutamento', recrutamento);
    form.set('aceitaDesafios', aceitaDesafios ? 'true' : 'false');
    form.set('faixaEtaria', faixaEtaria);
    form.set('whatsappResponsavel', whatsappResponsavel.trim());
    form.set('mensalidadeValor', mensalidadeValor);
    if (escudoFile) form.set('escudo', escudoFile);

    const url = isEdit ? `/api/times/${time.id}` : '/api/times';
    const res = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(json.error || 'Não consegui salvar. Tenta de novo.'); return; }
    onSaved(json);
  }

  return (
    <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal">
        <h3>{isEdit ? 'Editar time' : 'Criar time'}</h3>
        <WizardProgress current={step} />

        {step === 0 && (
          <div>
            <div className="pl-field" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar nome={nome} size={64} fotoUrl={escudoPreview} />
              <div>
                <label htmlFor="escudo-input" className="pl-share-btn" style={{ cursor: 'pointer' }}>
                  {escudoPreview ? 'Trocar escudo' : 'Adicionar escudo (opcional)'}
                </label>
                <input id="escudo-input" type="file" accept="image/*" onChange={handleEscudoChange} style={{ display: 'none' }} />
              </div>
            </div>
            <div className="pl-field"><label>Nome do time</label><input value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
            <div className="pl-field"><label>Sigla (opcional)</label><input value={sigla} onChange={(e) => setSigla(e.target.value)} maxLength={5} placeholder="Ex: FCP" /></div>
            <div className="pl-field"><label>Ano de fundação (opcional)</label><input type="number" min="1900" max="2100" value={anoFundacao} onChange={(e) => setAnoFundacao(e.target.value)} placeholder="Ex: 2020" /></div>

            <ColorPicker label="Cor primária do uniforme (opcional)" value={corPrimaria} onChange={setCorPrimaria} />
            <ColorPicker label="Cor secundária do uniforme (opcional)" value={corSecundaria} onChange={setCorSecundaria} />
            {(corPrimaria || corSecundaria) && (
              <div className="pl-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UniformPreview corPrimaria={corPrimaria} corSecundaria={corSecundaria} size={40} />
                <span style={{ fontSize: 12, color: 'var(--paper-dim)' }}>Prévia do uniforme</span>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="pl-field"><label>Bairro (opcional)</label><input value={bairro} onChange={(e) => setBairro(e.target.value)} /></div>
            {arenas.length > 0 && (
              <div className="pl-field">
                <label>Arena principal (opcional)</label>
                <select className="pl-select" style={{ width: '100%' }} value={arenaId} onChange={(e) => setArenaId(e.target.value)}>
                  <option value="">Não informar</option>
                  {arenas.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.bairro})</option>)}
                </select>
              </div>
            )}
            <div className="pl-field">
              <label>Modalidade principal (opcional)</label>
              <select className="pl-select" style={{ width: '100%' }} value={modalidade} onChange={(e) => setModalidade(e.target.value)}>
                <option value="">Não informar</option>
                {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="pl-field"><label>Técnico (opcional)</label><input value={tecnico} onChange={(e) => setTecnico(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="pl-field" style={{ flex: 1 }}>
                <label>Dia fixo de jogo (opcional)</label>
                <select className="pl-select" style={{ width: '100%' }} value={diaJogo} onChange={(e) => setDiaJogo(e.target.value)}>
                  <option value="">Não informar</option>
                  {DIAS_SEMANA.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="pl-field" style={{ flex: 1 }}>
                <label>Horário (opcional)</label>
                <input type="time" value={horarioJogo} onChange={(e) => setHorarioJogo(e.target.value)} />
              </div>
            </div>
            <div className="pl-field"><label>Limite de elenco</label><input type="number" min={1} max={99} value={maxJogadores} onChange={(e) => setMaxJogadores(e.target.value)} /></div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="pl-field">
              <label>Nível competitivo (opcional)</label>
              <div className="pl-tipo-jogo-chips">
                {NIVEL_COMPETITIVO_OPCOES.map((n) => (
                  <button
                    key={n.value}
                    type="button"
                    className={`pl-chip ${nivelCompetitivo === n.value ? 'active' : ''}`}
                    onClick={() => setNivelCompetitivo(nivelCompetitivo === n.value ? '' : n.value)}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="pl-field">
              <label>Faixa etária do elenco (opcional)</label>
              <div className="pl-tipo-jogo-chips">
                {FAIXA_ETARIA_OPCOES.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={`pl-chip ${faixaEtaria === f.value ? 'active' : ''}`}
                    onClick={() => setFaixaEtaria(faixaEtaria === f.value ? '' : f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="pl-field">
              <label>Recrutamento</label>
              <select className="pl-select" style={{ width: '100%' }} value={recrutamento} onChange={(e) => setRecrutamento(e.target.value)}>
                {RECRUTAMENTO_OPCOES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="pl-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none' }}>
                <input type="checkbox" checked={aceitaDesafios} onChange={(e) => setAceitaDesafios(e.target.checked)} />
                Aceita desafios de outros times
              </label>
            </div>
            <div className="pl-field"><label>WhatsApp do responsável (opcional)</label><input value={whatsappResponsavel} onChange={(e) => setWhatsappResponsavel(e.target.value)} placeholder="Ex: 11999999999" /></div>
            <div className="pl-field"><label>Mensalidade em R$ (opcional)</label><input type="number" min="0" step="0.5" value={mensalidadeValor} onChange={(e) => setMensalidadeValor(e.target.value)} placeholder="Ex: 50" /></div>
          </div>
        )}

        {error && <p className="pl-error">{error}</p>}
        <div className="pl-modal-actions">
          {step === 0 ? (
            <button type="button" className="pl-btn-secondary" onClick={onClose}>Cancelar</button>
          ) : (
            <button type="button" className="pl-btn-secondary" onClick={goBack}>Voltar</button>
          )}
          {step < STEPS.length - 1 ? (
            <TicketButton onClick={goNext}>Avançar</TicketButton>
          ) : (
            <TicketButton onClick={handleSubmit} disabled={loading}>{loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar time'}</TicketButton>
          )}
        </div>
      </div>
    </div>
  );
}
