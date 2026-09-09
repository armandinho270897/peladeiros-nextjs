'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/ToastProvider';
import Avatar from '../components/Avatar';
import EmptyFieldIcon from '../components/EmptyFieldIcon';
import TicketButton from '../components/TicketButton';
import NewTimeModal from '../components/NewTimeModal';
import BackLink from '../components/BackLink';
import TimeCard from '../components/TimeCard';

export default function TimesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [times, setTimes] = useState([]);
  const [convites, setConvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoTimeAberto, setNovoTimeAberto] = useState(false);

  const [aba, setAba] = useState('meus');
  const [descobrir, setDescobrir] = useState(null);
  const [descobrirBusca, setDescobrirBusca] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();
    const [{ data: meusTimes }, { data: pendentes }] = await Promise.all([
      supabase.from('time_membros').select('papel, times(id, nome, escudo_url, bairro, modalidade, sigla, tecnico, dia_jogo, horario_jogo, recrutamento, max_jogadores)').eq('user_id', user.id).eq('status', 'aprovado'),
      supabase.from('time_membros').select('id, times(id, nome, escudo_url, bairro, modalidade)').eq('user_id', user.id).eq('status', 'pendente'),
    ]);
    setTimes((meusTimes || []).map((m) => ({ ...m.times, papel: m.papel })));
    setConvites(pendentes || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function loadDescobrir() {
    if (!user) return;
    setDescobrir((prev) => (prev === null ? [] : prev));
    const supabase = createClient();
    const { data } = await supabase
      .from('times')
      .select('id, nome, escudo_url, bairro, modalidade, sigla, tecnico, dia_jogo, horario_jogo, recrutamento, max_jogadores')
      .eq('privado', false)
      .order('created_at', { ascending: false })
      .limit(30);
    const meusIds = new Set([...times.map((t) => t.id), ...convites.map((c) => c.times.id)]);
    setDescobrir((data || []).filter((t) => !meusIds.has(t.id)));
  }

  function abrirAba(qual) {
    setAba(qual);
    if (qual === 'descobrir' && descobrir === null) loadDescobrir();
  }

  async function responderConvite(convite, aceitar) {
    const res = await fetch(`/api/time-membros/${convite.id}/${aceitar ? 'aceitar' : 'recusar'}`, { method: 'POST' });
    if (!res.ok) { showToast('Não consegui responder o convite.', 'error'); return; }
    showToast(aceitar ? `Você entrou no time ${convite.times.nome}!` : 'Convite recusado.');
    load();
  }

  const descobrirFiltrados = (descobrir || []).filter((t) => {
    const q = descobrirBusca.trim().toLowerCase();
    if (!q) return true;
    return t.nome.toLowerCase().includes(q) || (t.bairro || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="pl-header">
        <BackLink href="/perfil" />
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--paper)' }}>Times</h2>
      </div>

      {convites.length > 0 && (
        <>
          <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
            Convites pendentes
          </div>
          <div className="pl-list">
            {convites.map((c) => (
              <div key={c.id} className="pl-card">
                <Avatar nome={c.times.nome} size={48} fotoUrl={c.times.escudo_url} />
                <div className="pl-info">
                  <h3>{c.times.nome}</h3>
                  {c.times.bairro && <span className="pl-bairro-tag">{c.times.bairro}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="pl-btn-secondary" onClick={() => responderConvite(c, false)}>Recusar</button>
                  <TicketButton compact onClick={() => responderConvite(c, true)}>Aceitar</TicketButton>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px' }}>
        <div className="pl-times-tabs">
          <div className="pl-times-tab-pill" style={{ transform: aba === 'descobrir' ? 'translateX(100%)' : 'translateX(0%)' }}>
            <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
              <path d="M6 30 L6 5 L94 5 L94 30" fill="none" stroke="var(--neon)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <button type="button" className={`pl-times-tab ${aba === 'meus' ? 'active' : ''}`} onClick={() => abrirAba('meus')}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></svg>
            Meus times
          </button>
          <button type="button" className={`pl-times-tab ${aba === 'descobrir' ? 'active' : ''}`} onClick={() => abrirAba('descobrir')}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M14.5 9.5l-2 5-5 2 2-5z" /></svg>
            Descobrir
          </button>
        </div>
      </div>

      {aba === 'meus' && (
        <>
          <div className="pl-section-title" style={{ maxWidth: 640, margin: '4px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Seus times</span>
            <TicketButton compact onClick={() => setNovoTimeAberto(true)}>Criar time</TicketButton>
          </div>

          {loading ? (
            <div className="pl-list">
              {[1, 2].map((i) => <div key={i} className="pl-skeleton" style={{ height: 72 }} />)}
            </div>
          ) : times.length === 0 ? (
            <div className="pl-empty">
              <EmptyFieldIcon />
              <p>Tá sem time ainda. Cria o seu ou espera um convite.</p>
            </div>
          ) : (
            <div className="pl-list" style={{ paddingBottom: 24, gap: 10 }}>
              {times.map((t, i) => <TimeCard key={t.id} time={t} index={i} />)}
            </div>
          )}
        </>
      )}

      {aba === 'descobrir' && (
        <>
          <div className="pl-section-title" style={{ maxWidth: 640, margin: '4px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
            Times perto de você
          </div>

          <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
            <div className="pl-descobrir-wrap">
              <div className={`pl-descobrir-search-bar ${buscaAberta ? 'open' : ''}`}>
                <div className="pl-descobrir-search-bar-inner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input
                    type="text"
                    value={descobrirBusca}
                    onChange={(e) => setDescobrirBusca(e.target.value)}
                    placeholder="Buscar por nome ou bairro..."
                    autoFocus={buscaAberta}
                  />
                </div>
              </div>
              <button
                type="button"
                className={`pl-descobrir-fab ${buscaAberta ? 'open' : ''}`}
                aria-label="Buscar times"
                onClick={() => {
                  const abrir = !buscaAberta;
                  setBuscaAberta(abrir);
                  if (!abrir) setDescobrirBusca('');
                }}
              >
                <span className="pl-descobrir-fab-ring" />
                <svg className="pl-icon-search" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <svg className="pl-icon-close" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.6" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
              </button>
            </div>
          </div>

          {descobrir === null ? (
            <div className="pl-list" style={{ paddingBottom: 24 }}>
              {[1, 2].map((i) => <div key={i} className="pl-skeleton" style={{ height: 72 }} />)}
            </div>
          ) : descobrirFiltrados.length === 0 ? (
            <div className="pl-empty">
              <EmptyFieldIcon />
              <p>{descobrirBusca ? 'Nenhum time encontrado.' : 'Nenhum time público disponível por enquanto.'}</p>
            </div>
          ) : (
            <div className="pl-list" style={{ paddingBottom: 24, gap: 10 }}>
              {descobrirFiltrados.map((t, i) => <TimeCard key={t.id} time={t} index={i} />)}
            </div>
          )}
        </>
      )}

      {novoTimeAberto && (
        <NewTimeModal
          onClose={() => setNovoTimeAberto(false)}
          onCreated={() => { setNovoTimeAberto(false); showToast('Time criado!'); load(); }}
        />
      )}
    </div>
  );
}
